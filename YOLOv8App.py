from ultralytics import YOLO
import cv2
import time
import numpy as np
from datetime import datetime

model = YOLO("yolov8n.pt")
video_capture = cv2.VideoCapture(0)
initial_width, initial_height = 1280, 720
video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, initial_width)
video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, initial_height)

success, test_frame = video_capture.read()
if success:
    initial_height, initial_width = test_frame.shape[:2]

cv2.namedWindow("Study Focus Monitor", cv2.WINDOW_NORMAL)
cv2.resizeWindow("Study Focus Monitor", initial_width, initial_height)

phone_detected_start_time = None
person_absent_start_time = None
person_absent_threshold = 5
phone_detect_threshold = 3
flicker_tolerance = 2.0
last_phone_detection_time = None
last_person_detection_time = None

UI_BLUE = (255, 180, 50)
UI_RED = (0, 0, 255)
UI_GREEN = (0, 200, 0)
UI_YELLOW = (0, 255, 255)
UI_WHITE = (255, 255, 255)
UI_BLACK = (0, 0, 0)
UI_GRAY = (70, 70, 70)
UI_ORANGE = (0, 165, 255)

focus_start_time = time.time()
distraction_start_time = None
total_distraction_time = 0
distraction_logs = []
current_distraction_session = None

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def format_12hour_time(time_str):
    dt = datetime.strptime(time_str, "%H:%M:%S")
    return dt.strftime("%I:%M %p")

while video_capture.isOpened():
    ret, frame = video_capture.read()
    if not ret:
        break

    current_time = time.time()
    original_height, original_width = frame.shape[:2]
    
    window_rect = cv2.getWindowImageRect("Study Focus Monitor")
    if window_rect[2] > 0 and window_rect[3] > 0:
        display_width, display_height = window_rect[2], window_rect[3]
    else:
        display_width, display_height = original_width, original_height

    display_frame = cv2.resize(frame, (display_width, display_height), interpolation=cv2.INTER_LINEAR)
    results = model(frame)
    phone_detected = False
    person_detected = False
    detected_object_type = ""

    for result in results:
        for box in result.boxes:
            conf = box.conf[0].item()
            cls = int(box.cls[0].item())
            
            if conf < 0.5:
                continue

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            scaled_x1 = int(x1 * display_width / original_width)
            scaled_y1 = int(y1 * display_height / original_height)
            scaled_x2 = int(x2 * display_width / original_width)
            scaled_y2 = int(y2 * display_height / original_height)

            object_type = model.names[cls]
            label = f"{object_type} {conf:.2f}"
            box_color = UI_GREEN
            
            if object_type.lower() == "cell phone":
                phone_detected = True
                detected_object_type = "Cell Phone"
                last_phone_detection_time = current_time
                box_color = UI_RED
            elif object_type.lower() == "person":
                person_detected = True
                last_person_detection_time = current_time
            
            cv2.rectangle(display_frame, (scaled_x1, scaled_y1), (scaled_x2, scaled_y2), box_color, 2)
            
            text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            cv2.rectangle(display_frame, (scaled_x1, scaled_y1 - 25), (scaled_x1 + text_size[0] + 10, scaled_y1), box_color, -1)
            cv2.putText(display_frame, label, (scaled_x1 + 5, scaled_y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)

    if not phone_detected and last_phone_detection_time is not None:
        if current_time - last_phone_detection_time < flicker_tolerance:
            phone_detected = True
        else:
            last_phone_detection_time = None
            
    person_absent = not person_detected and (last_person_detection_time is None or current_time - last_person_detection_time >= flicker_tolerance)

    cv2.rectangle(display_frame, (0, 0), (display_width, 30), UI_BLUE, -1)
    
    title_text = "Study Focus Monitor"
    title_size = cv2.getTextSize(title_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
    title_x = (display_width - title_size[0]) // 2
    cv2.putText(display_frame, title_text, (title_x, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, UI_WHITE, 2)
    
    instructions = "Press 'q' to exit | Press 'r' to reset timer"
    cv2.putText(display_frame, instructions, (display_width - 350, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    # Handle phone detection if person is present
    if not person_absent and phone_detected:
        if phone_detected_start_time is None:
            phone_detected_start_time = current_time
            distraction_start_time = current_time
            current_time_str = datetime.now().strftime("%H:%M:%S")
            current_distraction_session = {
                "type": "Cell Phone",
                "start_time_12h": format_12hour_time(current_time_str),
                "duration": 0
            }
        
        elapsed_time = current_time - phone_detected_start_time
        if elapsed_time >= phone_detect_threshold:
            warning_text = "Phone detected! Stay focused on your study!"
            text_size = cv2.getTextSize(warning_text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
            text_x = (display_width - text_size[0]) // 2
            
            overlay = display_frame.copy()
            cv2.rectangle(overlay, (0, 35), (display_width, 95), UI_RED, -1)
            cv2.addWeighted(overlay, 0.7, display_frame, 0.3, 0, display_frame)
            
            cv2.putText(display_frame, warning_text, (text_x, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.9, UI_WHITE, 2)
    elif not phone_detected:
        phone_detected_start_time = None

    # Handle person absence detection
    if person_absent:
        if person_absent_start_time is None:
            person_absent_start_time = current_time
        
        elapsed_absence_time = current_time - person_absent_start_time
        if elapsed_absence_time >= person_absent_threshold:
            if distraction_start_time is None:
                distraction_start_time = person_absent_start_time
                current_time_str = datetime.fromtimestamp(person_absent_start_time).strftime("%H:%M:%S")
                current_distraction_session = {
                    "type": "Left Desk",
                    "start_time_12h": format_12hour_time(current_time_str),
                    "duration": 0
                }
            
            warning_text = "You left your desk! Return to continue studying!"
            text_size = cv2.getTextSize(warning_text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
            text_x = (display_width - text_size[0]) // 2
            
            overlay = display_frame.copy()
            cv2.rectangle(overlay, (0, 35), (display_width, 95), UI_ORANGE, -1)
            cv2.addWeighted(overlay, 0.7, display_frame, 0.3, 0, display_frame)
            
            cv2.putText(display_frame, warning_text, (text_x, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.9, UI_WHITE, 2)
    else:
        # Person returned after being absent
        if person_absent_start_time is not None:
            absence_duration = current_time - person_absent_start_time
            
            # If absence was long enough to log
            if absence_duration >= person_absent_threshold and distraction_start_time is not None:
                distraction_duration = current_time - distraction_start_time
                total_distraction_time += distraction_duration
                
                if current_distraction_session and current_distraction_session["type"] == "Left Desk":
                    end_time_str = datetime.now().strftime("%H:%M:%S")
                    end_time_12h = format_12hour_time(end_time_str)
                    
                    final_log_entry = {
                        "type": "Left Desk",
                        "start_time_12h": current_distraction_session["start_time_12h"],
                        "end_time_12h": end_time_12h,
                        "duration": int(distraction_duration)
                    }
                    distraction_logs.append(final_log_entry)
                
                distraction_start_time = None
                current_distraction_session = None
            
            person_absent_start_time = None

    # Handle ending a phone distraction when the phone is put away
    if not phone_detected and not person_absent and distraction_start_time is not None and current_distraction_session and current_distraction_session["type"] == "Cell Phone":
        distraction_duration = current_time - distraction_start_time
        
        if distraction_duration >= phone_detect_threshold:
            total_distraction_time += distraction_duration
            
            end_time_str = datetime.now().strftime("%H:%M:%S")
            end_time_12h = format_12hour_time(end_time_str)
            
            final_log_entry = {
                "type": "Cell Phone",
                "start_time_12h": current_distraction_session["start_time_12h"],
                "end_time_12h": end_time_12h,
                "duration": int(distraction_duration)
            }
            distraction_logs.append(final_log_entry)
            
            distraction_start_time = None
            current_distraction_session = None
    
    total_study_time = current_time - focus_start_time
    current_distraction_time = total_distraction_time
    if distraction_start_time is not None:
        current_distraction_time += (current_time - distraction_start_time)
    
    focus_time = total_study_time - current_distraction_time
    
    if total_study_time > 0:
        focus_percentage = (focus_time / total_study_time) * 100
    else:
        focus_percentage = 100
    
    cv2.rectangle(display_frame, (0, display_height - 60), (display_width, display_height), UI_BLACK, -1)
    
    study_time_text = f"Total Study Time: {format_time(total_study_time)}"
    focus_time_text = f"Focus Time: {format_time(focus_time)}"
    percentage_text = f"Focus: {focus_percentage:.1f}%"
    
    cv2.putText(display_frame, study_time_text, (10, display_height - 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)
    cv2.putText(display_frame, focus_time_text, (10, display_height - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)
    cv2.putText(display_frame, percentage_text, (display_width - 200, display_height - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)

    log_panel_width = 430
    log_start_y = 40
    
    overlay = display_frame.copy()
    cv2.rectangle(overlay, (0, log_start_y), (log_panel_width, display_height - 60), UI_GRAY, -1)
    cv2.addWeighted(overlay, 0.7, display_frame, 0.3, 0, display_frame)
    
    cv2.putText(display_frame, "Distraction Log", (10, log_start_y + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, UI_WHITE, 2)
    
    cv2.line(display_frame, (10, log_start_y + 35), (log_panel_width - 10, log_start_y + 35), UI_WHITE, 1)
    
    cv2.putText(display_frame, "Type", (10, log_start_y + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_YELLOW, 1)
    cv2.putText(display_frame, "Start", (130, log_start_y + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_YELLOW, 1)
    cv2.putText(display_frame, "End", (240, log_start_y + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_YELLOW, 1)
    cv2.putText(display_frame, "Duration", (350, log_start_y + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_YELLOW, 1)
    
    max_logs = 12
    logs_to_display = distraction_logs[-max_logs:] if len(distraction_logs) > max_logs else distraction_logs.copy()
    
    for i, log in enumerate(reversed(logs_to_display)):
        y_pos = log_start_y + 80 + i * 25
        
        if y_pos > display_height - 70:
            break
        
        cv2.putText(display_frame, log["type"], (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
        cv2.putText(display_frame, log["start_time_12h"], (130, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
        
        end_time = log["end_time_12h"] if "end_time_12h" in log and log["end_time_12h"] else "ongoing"
        cv2.putText(display_frame, end_time, (240, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
        
        duration_text = f"{log['duration']}s"
        cv2.putText(display_frame, duration_text, (350, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
    
    if not logs_to_display:
        cv2.putText(display_frame, "No distractions detected", (10, log_start_y + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
    
    if distraction_logs:
        log_count_text = f"Total: {len(distraction_logs)} session(s)"
        cv2.putText(display_frame, log_count_text, (10, display_height - 80), cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    cv2.imshow("Study Focus Monitor", display_frame)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('r'):
        focus_start_time = time.time()
        total_distraction_time = 0
        distraction_start_time = None
        phone_detected_start_time = None
        distraction_logs = []
        current_distraction_session = None

video_capture.release()
cv2.destroyAllWindows()
