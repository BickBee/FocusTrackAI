from ultralytics import YOLO
import cv2
import time
import random
import numpy as np
from datetime import datetime, timedelta

global show_study_bot, show_mental_bot, current_study_recommendation, current_mental_recommendation

model = YOLO("yolov8n.pt")
video_capture = cv2.VideoCapture(0)
initial_width, initial_height = 1920, 1080
video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, initial_width)
video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, initial_height)

user_question = ""
input_active = False
cursor_visible = True
cursor_blink_time = time.time()
cursor_blink_interval = 0.5

def process_user_question(question):
    """
    Process a user question and return an appropriate response.
    First checks for three special (hardcoded) questions, then
    falls back to the normal logic.
    """
    q_lower = question.lower().strip()

    # --- 3 HARDCODED Q&A examples ---
    if q_lower == "how do i find motivation?":
        return "Try setting small, achievable goals to build momentum, and reward yourself for progress."
    elif q_lower == "how can i study effectively?":
        return "Plan your sessions, remove distractions, and use active recall to test yourself frequently."
    elif q_lower == "what's a good break schedule?":
        return "Many people like 50–90 minute study blocks with 10–15 minute rest intervals in between."

    if "focus" in q_lower or "concentrate" in q_lower:
        return f"Based on your recent focus metrics (focus rate: {focus_percentage:.1f}%), try the Pomodoro technique - 25 minutes focused, 5 minutes break."
    elif "efficient" in q_lower or "productivity" in q_lower:
        return f"I noticed you had {len(distraction_logs)} distractions today. Try studying in a quiet spot or using noise-cancelling headphones."
    elif "schedule" in q_lower or "time" in q_lower:
        return f"Your focus time is {format_time(focus_time)}. Consider scheduling {min(int(focus_time/3600) + 1, 8)} hours daily in 1-2 hour blocks."
    elif "phone" in q_lower or "distraction" in q_lower:
        return f"Phone distractions account for {get_phone_distraction_percentage(distraction_logs):.1f}% of your interruptions. Consider an app blocker or placing the phone away."
    elif "morning" in q_lower or "evening" in q_lower or "best time" in q_lower:
        return "Your peak focus time appears to be in the morning. Tackle your hardest tasks then."
    elif "remember" in q_lower or "retention" in q_lower or "memorize" in q_lower:
        return "Use spaced repetition. Review material after 1 day, 3 days, and 7 days for better long-term memory."
    elif "break" in q_lower or "rest" in q_lower:
        return f"Your average session is {get_average_session_length(total_study_time, total_distraction_time)} minutes. Aim for 50-90 minute sessions with short breaks."
    elif "exam" in q_lower or "test" in q_lower or "recall" in q_lower:
        return "Try active recall methods: quiz yourself or practice past exams instead of just re-reading notes."
    else:
        return "I don't have specific tips for that question yet. Try asking about focus, efficiency, scheduling, memory, or exam prep."

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
UI_DARK_GREEN = (0, 100, 0)

study_panel_x = 0
study_panel_y = 0
study_panel_width = 400
study_panel_height = 220
mental_panel_x = 0
mental_panel_y = 0
mental_panel_width = 400
mental_panel_height = 200

study_questions = [
    "What's the best way to improve my focus?",
    "How can I study more efficiently?",
    "Should I take more breaks?",
    "How can I avoid phone distractions?",
    "What time of day is best for studying?",
    "How do I maintain motivation?",
    "What's a good study schedule?",
    "How can I remember more of what I study?"
]

study_responses = [
    "Based on your recent focus metrics (focus rate: {focus_percent:.1f}%), try Pomodoro: 25 on, 5 off.",
    "You've had {distraction_count} distractions today. Try a quieter environment.",
    "Your focus time is {focus_time_str}. Increase your daily study by 15 minutes each week.",
    "Phone distractions are {phone_distractions:.1f}% of your interruptions. Consider phone-free timeslots.",
    "Your pattern suggests morning is your peak focus time.",
    "Use spaced reviews for better retention.",
    "Your average study session is {avg_session_length} min. 50-90 min is ideal for deep work.",
    "Active recall: test yourself rather than just reading."
]

mental_health_questions = [
    "How can I manage study stress?",
    "I'm feeling overwhelmed with my workload",
    "How do I know if I'm studying too much?",
    "What are signs of burnout?",
    "I feel anxious before exams",
    "How can I maintain work-life balance?"
]

mental_health_responses = [
    "Your sessions are {session_length_trend}. Take breaks and try a 5-min meditation.",
    "You've studied {total_study_hours_today:.1f} hrs today. Walk or stretch to recharge.",
    "Your ratio is {study_break_ratio:.1f}:1. Try ~4:1 for a balanced approach.",
    "You've studied {consecutive_study_days} consecutive days. Schedule a rest day to avoid burnout.",
    "Evening shows more distractions ({evening_distractions}). Move tasks earlier if possible.",
    "Try progressive muscle relaxation to reduce physical tension.",
    "You scored {boundary_score}/10 on work-life boundaries. Separate your study/personal time.",
    "Before each session, do 2 minutes of mindful breathing."
]

show_study_bot = False
show_mental_bot = False
current_study_recommendation = ""
current_mental_recommendation = ""

last_bot_update_time = time.time()
bot_update_interval = 60

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

def get_phone_distraction_percentage(logs):
    if not logs:
        return 0
    phone_count = sum(1 for log in logs if log["type"] == "Cell Phone")
    return (phone_count / len(logs)) * 100

def get_average_session_length(total_time, distraction_time):
    if total_time <= 0:
        return 0
    focused_time = total_time - distraction_time

    estimated_sessions = max(1, focused_time / 1800)
    return round((focused_time / estimated_sessions) / 60)

def get_session_length_trend(logs, current_time):
    if not logs or len(logs) < 2:
        return "fairly consistent"
    recent_logs = logs[-min(5, len(logs)):]
    durations = [log["duration"] for log in recent_logs]
    if sum(durations) / len(durations) > 300:
        return "showing longer breaks"
    elif len(logs) > 5 and sum(durations) / len(durations) < 120:
        return "improving with shorter breaks"
    return "relatively steady"

def get_study_recommendation(focus_percentage, distraction_logs, focus_time, total_study_time):
    question = random.choice(study_questions)
    response_template = random.choice(study_responses)
    distraction_count = len(distraction_logs)
    focus_time_str = format_time(focus_time)
    phone_distractions = get_phone_distraction_percentage(distraction_logs)
    avg_session_length = get_average_session_length(total_study_time, total_study_time - focus_time)
    response = response_template.format(
        focus_percent=focus_percentage,
        distraction_count=distraction_count,
        focus_time_str=focus_time_str,
        phone_distractions=phone_distractions,
        avg_session_length=avg_session_length
    )
    return question, response

def get_mental_health_recommendation(total_study_time, distraction_logs, focus_time):
    question = random.choice(mental_health_questions)
    response_template = random.choice(mental_health_responses)
    session_length_trend = get_session_length_trend(distraction_logs, time.time())
    total_study_hours_today = total_study_time / 3600
    if total_study_time - focus_time > 0:
        study_break_ratio = focus_time / (total_study_time - focus_time)
    else:
        study_break_ratio = 5.0

    consecutive_study_days = random.randint(1, 7)
    evening_distractions = random.randint(2, 8)
    boundary_score = random.randint(4, 9)
    response = response_template.format(
        session_length_trend=session_length_trend,
        total_study_hours_today=total_study_hours_today,
        study_break_ratio=study_break_ratio,
        consecutive_study_days=consecutive_study_days,
        evening_distractions=evening_distractions,
        boundary_score=boundary_score
    )
    return question, response

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

    # Object detection loop
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
                last_phone_detection_time = current_time
                box_color = UI_RED
            elif object_type.lower() == "person":
                person_detected = True
                last_person_detection_time = current_time

            cv2.rectangle(display_frame, (scaled_x1, scaled_y1),
                          (scaled_x2, scaled_y2), box_color, 2)
            text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            cv2.rectangle(display_frame, (scaled_x1, scaled_y1 - 25),
                          (scaled_x1 + text_size[0] + 10, scaled_y1), box_color, -1)
            cv2.putText(display_frame, label, (scaled_x1 + 5, scaled_y1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)

    # Flicker tolerance for phone
    if not phone_detected and last_phone_detection_time:
        if current_time - last_phone_detection_time < flicker_tolerance:
            phone_detected = True
        else:
            last_phone_detection_time = None

    # Person absent detection
    person_absent = not person_detected and (
        last_person_detection_time is None or current_time - last_person_detection_time >= flicker_tolerance
    )

    # Title bar
    cv2.rectangle(display_frame, (0, 0), (display_width, 30), UI_BLUE, -1)
    title_text = "Study Focus Monitor"
    title_size = cv2.getTextSize(title_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
    title_x = (display_width - title_size[0]) // 2
    cv2.putText(display_frame, title_text, (title_x, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, UI_WHITE, 2)

    instructions = "Press 'q' to exit | 'r' to reset | 's'/'m' for bots | 'n' for new advice"
    instr_size = cv2.getTextSize(instructions, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
    instr_x = display_width - instr_size[0] - 10
    cv2.putText(display_frame, instructions, (instr_x, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    # --------------------------- PHONE DETECTION LOGIC ---------------------------
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
            cv2.putText(display_frame, warning_text, (text_x, 75),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, UI_WHITE, 2)
    elif not phone_detected:
        phone_detected_start_time = None

    # --------------------------- PERSON ABSENT LOGIC ---------------------------
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
            cv2.putText(display_frame, warning_text, (text_x, 75),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, UI_WHITE, 2)
    else:
        if person_absent_start_time is not None:
            absence_duration = current_time - person_absent_start_time
            if absence_duration >= person_absent_threshold and distraction_start_time is not None:
                distraction_duration = current_time - distraction_start_time
                total_distraction_time += distraction_duration
                if current_distraction_session and current_distraction_session["type"] == "Left Desk":
                    end_time_str = datetime.now().strftime("%H:%M:%S")
                    end_time_12h = format_12hour_time(end_time_str)
                    distraction_logs.append({
                        "type": "Left Desk",
                        "start_time_12h": current_distraction_session["start_time_12h"],
                        "end_time_12h": end_time_12h,
                        "duration": int(distraction_duration)
                    })
                distraction_start_time = None
                current_distraction_session = None
            person_absent_start_time = None

    # Ending phone distraction
    if (not phone_detected and not person_absent and
        distraction_start_time is not None and
        current_distraction_session and current_distraction_session["type"] == "Cell Phone"):
        distraction_duration = current_time - distraction_start_time
        if distraction_duration >= phone_detect_threshold:
            total_distraction_time += distraction_duration
            end_time_str = datetime.now().strftime("%H:%M:%S")
            end_time_12h = format_12hour_time(end_time_str)
            distraction_logs.append({
                "type": "Cell Phone",
                "start_time_12h": current_distraction_session["start_time_12h"],
                "end_time_12h": end_time_12h,
                "duration": int(distraction_duration)
            })
            distraction_start_time = None
            current_distraction_session = None

    # Calculate study/focus times
    total_study_time = current_time - focus_start_time
    current_distraction_time = total_distraction_time
    if distraction_start_time is not None:
        current_distraction_time += (current_time - distraction_start_time)
    focus_time = total_study_time - current_distraction_time

    if total_study_time > 0:
        focus_percentage = (focus_time / total_study_time) * 100
    else:
        focus_percentage = 100

    # Bottom bar for stats
    cv2.rectangle(display_frame, (0, display_height - 60),
                  (display_width, display_height), UI_BLACK, -1)
    study_time_text = f"Total Study Time: {format_time(total_study_time)}"
    focus_time_text = f"Focus Time: {format_time(focus_time)}"
    percentage_text = f"Focus: {focus_percentage:.1f}%"
    cv2.putText(display_frame, study_time_text, (10, display_height - 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)
    cv2.putText(display_frame, focus_time_text, (10, display_height - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)
    cv2.putText(display_frame, percentage_text,
                (display_width - 200, display_height - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)

    # Distraction log panel
    log_panel_width = 430
    log_start_y = 40
    overlay = display_frame.copy()
    cv2.rectangle(overlay, (0, log_start_y),
                  (log_panel_width, display_height - 60), UI_GRAY, -1)
    cv2.addWeighted(overlay, 0.7, display_frame, 0.3, 0, display_frame)
    cv2.putText(display_frame, "Distraction Log", (10, log_start_y + 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, UI_WHITE, 2)
    cv2.line(display_frame, (10, log_start_y + 35),
             (log_panel_width - 10, log_start_y + 35), UI_WHITE, 1)
    cv2.putText(display_frame, "Type", (10, log_start_y + 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_YELLOW, 1)
    cv2.putText(display_frame, "Start", (130, log_start_y + 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_YELLOW, 1)
    cv2.putText(display_frame, "End", (240, log_start_y + 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_YELLOW, 1)
    cv2.putText(display_frame, "Duration", (350, log_start_y + 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_YELLOW, 1)

    max_logs = 12
    logs_to_display = distraction_logs[-max_logs:] if len(distraction_logs) > max_logs else distraction_logs.copy()
    for i, log_entry in enumerate(reversed(logs_to_display)):
        y_pos = log_start_y + 80 + i * 25
        if y_pos > display_height - 70:
            break
        cv2.putText(display_frame, log_entry["type"], (10, y_pos),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
        cv2.putText(display_frame, log_entry["start_time_12h"], (130, y_pos),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
        end_time = log_entry.get("end_time_12h", "ongoing")
        cv2.putText(display_frame, end_time, (240, y_pos),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
        duration_text = f"{log_entry['duration']}s"
        cv2.putText(display_frame, duration_text, (350, y_pos),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    if not logs_to_display:
        cv2.putText(display_frame, "No distractions detected", (10, log_start_y + 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    if distraction_logs:
        log_count_text = f"Total: {len(distraction_logs)} session(s)"
        cv2.putText(display_frame, log_count_text, (10, display_height - 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    if current_time - last_bot_update_time > bot_update_interval:
        sq, sr = get_study_recommendation(focus_percentage, distraction_logs, focus_time, total_study_time)
        current_study_recommendation = f"Q: {sq}\nA: {sr}"

        mq, mr = get_mental_health_recommendation(total_study_time, distraction_logs, focus_time)
        current_mental_recommendation = f"Q: {mq}\nA: {mr}"

        last_bot_update_time = current_time

    # -------------------- STUDY BOT PANEL --------------------
    if show_study_bot:
        study_panel_width = 400
        study_panel_height = 260
        study_panel_x = display_width - study_panel_width - 20
        study_panel_y = 40

        overlay = display_frame.copy()
        cv2.rectangle(overlay, (study_panel_x, study_panel_y),
                      (study_panel_x + study_panel_width, study_panel_y + study_panel_height),
                      UI_BLUE, -1)
        cv2.addWeighted(overlay, 0.8, display_frame, 0.2, 0, display_frame)

        # Header
        cv2.rectangle(display_frame, (study_panel_x, study_panel_y),
                      (study_panel_x + study_panel_width, study_panel_y + 30),
                      UI_BLUE, -1)
        cv2.putText(display_frame, "Study Q&A Bot",
                    (study_panel_x + 10, study_panel_y + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)

        # Close button
        cv2.rectangle(display_frame,
                      (study_panel_x + study_panel_width - 30, study_panel_y),
                      (study_panel_x + study_panel_width, study_panel_y + 30),
                      (0, 0, 150), -1)
        cv2.putText(display_frame, "X",
                    (study_panel_x + study_panel_width - 20, study_panel_y + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)

        # "Refresh" button
        refresh_btn_width = 80
        cv2.rectangle(display_frame,
                      (study_panel_x + study_panel_width - refresh_btn_width - 30, study_panel_y),
                      (study_panel_x + study_panel_width - 30, study_panel_y + 30),
                      (0, 150, 200), -1)
        cv2.putText(display_frame, "Refresh",
                    (study_panel_x + study_panel_width - refresh_btn_width - 25, study_panel_y + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

        line_spacing = 25
        if current_study_recommendation:
            lines = current_study_recommendation.split('\n')
            text_y = study_panel_y + 50
            for i, line in enumerate(lines):
                words = line.split()
                current_line = ""
                line_num = 0
                for word in words:
                    test_line = (current_line + " " + word).strip() if current_line else word
                    text_size = cv2.getTextSize(test_line, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                    if text_size[0] < study_panel_width - 20:
                        current_line = test_line
                    else:
                        # Draw the existing line
                        cv2.putText(display_frame, current_line,
                                    (study_panel_x + 10, text_y + (i + line_num) * line_spacing),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
                        line_num += 1
                        current_line = word

                if current_line:
                    cv2.putText(display_frame, current_line,
                                (study_panel_x + 10, text_y + (i + line_num) * line_spacing),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

        # Input field
        study_input_field_y = study_panel_y + study_panel_height - 35
        cv2.rectangle(display_frame, (study_panel_x + 10, study_input_field_y),
                      (study_panel_x + study_panel_width - 50, study_input_field_y + 25),
                      UI_BLACK, -1)
        if input_active:
            display_text = user_question
            if cursor_visible:
                display_text += "|"
            cv2.putText(display_frame, display_text,
                        (study_panel_x + 15, study_input_field_y + 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
        else:
            cv2.putText(display_frame, "Type your question here...",
                        (study_panel_x + 15, study_input_field_y + 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (150, 150, 150), 1)

        # "Ask" button
        cv2.rectangle(display_frame,
                      (study_panel_x + study_panel_width - 45, study_input_field_y),
                      (study_panel_x + study_panel_width - 10, study_input_field_y + 25),
                      (0, 120, 255), -1)
        cv2.putText(display_frame, "Ask",
                    (study_panel_x + study_panel_width - 40, study_input_field_y + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    # -------------------- MENTAL HEALTH BOT PANEL --------------------
    if show_mental_bot:
        mental_panel_width = 400
        mental_panel_height = 200
        mental_panel_x = display_width - mental_panel_width - 20
        mental_panel_y = 310 if show_study_bot else 40

        overlay = display_frame.copy()
        cv2.rectangle(overlay, (mental_panel_x, mental_panel_y),
                      (mental_panel_x + mental_panel_width, mental_panel_y + mental_panel_height),
                      UI_GREEN, -1)
        cv2.addWeighted(overlay, 0.8, display_frame, 0.2, 0, display_frame)

        # Header
        cv2.rectangle(display_frame, (mental_panel_x, mental_panel_y),
                      (mental_panel_x + mental_panel_width, mental_panel_y + 30),
                      UI_GREEN, -1)
        cv2.putText(display_frame, "Mental Health Assistant",
                    (mental_panel_x + 10, mental_panel_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)

        # Close button
        cv2.rectangle(display_frame,
                      (mental_panel_x + mental_panel_width - 30, mental_panel_y),
                      (mental_panel_x + mental_panel_width, mental_panel_y + 30),
                      (0, 100, 0), -1)
        cv2.putText(display_frame, "X",
                    (mental_panel_x + mental_panel_width - 20, mental_panel_y + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, UI_WHITE, 2)

        # "Refresh" button
        refresh_btn_width = 80
        cv2.rectangle(display_frame,
                      (mental_panel_x + mental_panel_width - refresh_btn_width - 30, mental_panel_y),
                      (mental_panel_x + mental_panel_width - 30, mental_panel_y + 30),
                      (0, 150, 0), -1)
        cv2.putText(display_frame, "Refresh",
                    (mental_panel_x + mental_panel_width - refresh_btn_width - 25, mental_panel_y + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

        # Increase line spacing to reduce overlap
        line_spacing = 25
        lines = current_mental_recommendation.split('\n')
        for i, line in enumerate(lines):
            words = line.split()
            current_line = ""
            line_num = 0
            for word in words:
                test_line = (current_line + " " + word).strip() if current_line else word
                text_size = cv2.getTextSize(test_line, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                if text_size[0] < mental_panel_width - 20:
                    current_line = test_line
                else:
                    cv2.putText(display_frame, current_line,
                                (mental_panel_x + 10, mental_panel_y + 50 + (i + line_num) * line_spacing),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)
                    line_num += 1
                    current_line = word
            if current_line:
                cv2.putText(display_frame, current_line,
                            (mental_panel_x + 10, mental_panel_y + 50 + (i + line_num) * line_spacing),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    # -------------------- TOGGLE BUTTONS --------------------
    button_width = 160
    button_height = 25

    # Mental Bot toggle
    mental_bot_btn_x = 10
    mental_bot_btn_y = 5
    cv2.rectangle(
        display_frame,
        (mental_bot_btn_x, mental_bot_btn_y),
        (mental_bot_btn_x + button_width, mental_bot_btn_y + button_height),
        UI_DARK_GREEN if not show_mental_bot else UI_RED, -1
    )
    cv2.putText(display_frame,
                "Show Mental Bot" if not show_mental_bot else "Hide Mental Bot",
                (mental_bot_btn_x + 10, mental_bot_btn_y + 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    # Study Bot toggle
    study_bot_btn_x = mental_bot_btn_x + button_width + 10
    study_bot_btn_y = 5
    cv2.rectangle(
        display_frame,
        (study_bot_btn_x, study_bot_btn_y),
        (study_bot_btn_x + button_width, study_bot_btn_y + button_height),
        UI_DARK_GREEN if not show_study_bot else UI_RED, -1
    )
    cv2.putText(display_frame,
                "Show Study Bot" if not show_study_bot else "Hide Study Bot",
                (study_bot_btn_x + 10, study_bot_btn_y + 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, UI_WHITE, 1)

    # Blinking cursor
    if time.time() - cursor_blink_time > cursor_blink_interval:
        cursor_visible = not cursor_visible
        cursor_blink_time = time.time()

    cv2.imshow("Study Focus Monitor", display_frame)

    # -------------------- KEYBOARD HANDLING --------------------
    key = cv2.waitKey(1) & 0xFF

    if input_active:
        if key == 13:  # Enter
            if user_question.strip():
                response = process_user_question(user_question)
                current_study_recommendation = f"Q: {user_question}\nA: {response}"
                user_question = ""
        elif key == 8:  # Backspace
            if user_question:
                user_question = user_question[:-1]
        elif key == 27:  # Escape
            input_active = False
            user_question = ""
        elif 32 <= key < 128:  # ASCII range
            if len(user_question) < 50:
                user_question += chr(key)

    if not input_active:
        if key == ord('q'):
            break
        elif key == ord('r'):
            # Reset everything
            focus_start_time = time.time()
            total_distraction_time = 0
            distraction_start_time = None
            phone_detected_start_time = None
            distraction_logs.clear()
            current_distraction_session = None
            show_study_bot = False
            show_mental_bot = False
            current_study_recommendation = ""
            current_mental_recommendation = ""
            last_bot_update_time = time.time()
        elif key == ord('s'):
            show_study_bot = not show_study_bot
            if show_study_bot:
                current_study_recommendation = "Ask me a question about studying or focus techniques!"
                input_active = False
                user_question = ""
        elif key == ord('m'):
            show_mental_bot = not show_mental_bot
            if show_mental_bot:
                mq, mr = get_mental_health_recommendation(total_study_time, distraction_logs, focus_time)
                current_mental_recommendation = f"Q: {mq}\nA: {mr}"
        elif key == ord('n'):  # new mental health advice
            if show_mental_bot:
                mq, mr = get_mental_health_recommendation(total_study_time, distraction_logs, focus_time)
                current_mental_recommendation = f"Q: {mq}\nA: {mr}"
                last_bot_update_time = current_time

    # -------------------- MOUSE HANDLING --------------------
    if cv2.getWindowProperty("Study Focus Monitor", cv2.WND_PROP_VISIBLE) >= 1:
        def mouse_callback(event, x, y, flags, param):
            global show_study_bot, show_mental_bot, current_study_recommendation, current_mental_recommendation
            global last_bot_update_time, input_active, user_question

            if event == cv2.EVENT_LBUTTONDOWN:
                # Study Bot toggle
                if (study_bot_btn_x <= x <= study_bot_btn_x + button_width and
                    study_bot_btn_y <= y <= study_bot_btn_y + button_height):
                    show_study_bot = not show_study_bot
                    if show_study_bot:
                        current_study_recommendation = "Ask me a question about studying or focus techniques!"
                        input_active = False
                        user_question = ""

                # Mental Bot toggle
                elif (mental_bot_btn_x <= x <= mental_bot_btn_x + button_width and
                      mental_bot_btn_y <= y <= mental_bot_btn_y + button_height):
                    show_mental_bot = not show_mental_bot
                    if show_mental_bot:
                        mq, mr = get_mental_health_recommendation(total_study_time, distraction_logs, focus_time)
                        current_mental_recommendation = f"Q: {mq}\nA: {mr}"

                # ---------------- Study Bot Buttons ----------------
                refresh_btn_width = 80
                if show_study_bot:
                    # Study bot close button
                    if (study_panel_x + study_panel_width - 30 <= x <= study_panel_x + study_panel_width and
                        study_panel_y <= y <= study_panel_y + 30):
                        show_study_bot = False

                    # Study bot "Refresh" button
                    if (study_panel_x + study_panel_width - refresh_btn_width - 30 <= x <= study_panel_x + study_panel_width - 30 and
                        study_panel_y <= y <= study_panel_y + 30):
                        current_study_recommendation = "Ask me a specific question about studying!"
                        last_bot_update_time = time.time()

                    # Study bot input field
                    study_input_field_y = study_panel_y + study_panel_height - 35
                    if (study_panel_x + 10 <= x <= study_panel_x + study_panel_width - 50 and
                        study_input_field_y <= y <= study_input_field_y + 25):
                        input_active = True
                    elif (study_panel_x + study_panel_width - 45 <= x <= study_panel_x + study_panel_width - 10 and
                          study_input_field_y <= y <= study_input_field_y + 25):
                        # "Ask" button
                        if user_question.strip():
                            response = process_user_question(user_question)
                            current_study_recommendation = f"Q: {user_question}\nA: {response}"
                            user_question = ""

                # ---------------- Mental Bot Buttons ----------------
                if show_mental_bot:
                    # close button (X)
                    if (mental_panel_x + mental_panel_width - 30 <= x <= mental_panel_x + mental_panel_width and
                        mental_panel_y <= y <= mental_panel_y + 30):
                        show_mental_bot = False

                    # refresh button
                    if (mental_panel_x + mental_panel_width - refresh_btn_width - 30 <= x <= mental_panel_x + mental_panel_width - 30 and
                        mental_panel_y <= y <= mental_panel_y + 30):
                        mq, mr = get_mental_health_recommendation(total_study_time, distraction_logs, focus_time)
                        current_mental_recommendation = f"Q: {mq}\nA: {mr}"
                        last_bot_update_time = time.time()

        cv2.setMouseCallback("Study Focus Monitor", mouse_callback)

video_capture.release()
cv2.destroyAllWindows()
