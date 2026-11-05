import sys
import os
import re
import json
import base64

sys.stdout.reconfigure(encoding='utf-8')

# Category mapping based on question topics
TOPICS = {
    1: "Hệ thống tập tin & Ổ đĩa",
    2: "Người dùng, Nhóm & Phân quyền",
    3: "Người dùng, Nhóm & Phân quyền",
    4: "Quản trị hệ thống & Công nghệ",
    5: "Mạng máy tính & Giao thức",
    6: "Người dùng, Nhóm & Phân quyền",
    7: "Quản trị hệ thống & Tiến trình",
    8: "Quản trị hệ thống & Tiến trình",
    9: "Mạng máy tính & Dịch vụ",
    10: "Mạng máy tính & Dịch vụ",
    11: "Bảo mật & Dịch vụ Mạng",
    12: "Hệ thống tập tin & Ổ đĩa",
    13: "Mạng máy tính & Giao thức",
    14: "Mạng máy tính & Giao thức",
    15: "Người dùng, Nhóm & Phân quyền",
    16: "Hệ thống tập tin & Ổ đĩa",
    17: "Người dùng, Nhóm & Phân quyền",
    18: "Người dùng, Nhóm & Phân quyền",
    19: "Quản trị hệ thống & Lệnh Shell",
    20: "Tổng quan Hệ điều hành Linux",
    21: "Mạng máy tính & Giám sát",
    22: "Bảo mật & Tường lửa iptables",
    23: "Quản trị hệ thống & Tiến trình",
    24: "Quản trị hệ thống & Nhật ký",
    25: "Quản trị hệ thống & Khởi động",
    26: "Mạng máy tính & Giám sát",
    27: "Mạng máy tính & Cấu hình",
    28: "Hệ thống tập tin & Ổ đĩa",
    29: "Người dùng, Nhóm & Phân quyền",
    30: "Mạng máy tính & Giao thức",
    31: "Quản trị hệ thống & Quy trình",
    32: "Người dùng, Nhóm & Phân quyền",
    33: "Hệ thống tập tin & Ổ đĩa",
    34: "Người dùng, Nhóm & Phân quyền",
    35: "Quản trị hệ thống & Dịch vụ",
    36: "Quản trị hệ thống & Khởi động",
    37: "Bảo mật & Dịch vụ SSH",
    38: "Bảo mật & Phân quyền sudo",
    39: "Bảo mật & Phân quyền sudo",
    40: "Mạng máy tính & Phần cứng",
    41: "Người dùng, Nhóm & Phân quyền",
    42: "Bảo mật & Nhật ký hệ thống",
    43: "Mạng máy tính & Mô hình OSI/TCP",
    44: "Quản trị hệ thống & Giám sát",
    45: "Mạng máy tính & Giao thức",
    46: "Hệ thống tập tin & Khởi động MBR",
    47: "Người dùng, Nhóm & Phân quyền",
    48: "Người dùng, Nhóm & Phân quyền",
    49: "Quản trị hệ thống & Gói phần mềm",
    50: "Đạo đức & Trách nhiệm nghề nghiệp"
}

# Image mapping
IMAGE_FILES = {
    2: "assets/images/q2_group.png",
    3: "assets/images/q3_shadow.png",
    7: "assets/images/q7_crontab.png",
    17: "assets/images/q17_sharedoc_ls.png",
    18: "assets/images/q18_sharedoc_perm.png",
    21: "assets/images/q21_ifconfig.png",
    22: "assets/images/q22_iptables.png",
    39: "assets/images/q39_sudoers.png"
}

def get_base64_images():
    b64_map = {}
    for q_id, path in IMAGE_FILES.items():
        if os.path.exists(path):
            with open(path, 'rb') as f:
                data = base64.b64encode(f.read()).decode('utf-8')
                b64_map[q_id] = f"data:image/png;base64,{data}"
        else:
            print(f"Image not found: {path}")
    return b64_map

def parse_da():
    with open('DA.txt', encoding='utf-8') as f:
        da_text = f.read()

    blocks = re.findall(r'(\d+)\.\s*\*\*Đáp án:\s*(.*?)(?=\n\s*\d+\.\s*\*\*Đáp án|\Z)', da_text, re.DOTALL)
    answers = {}
    for num_str, content in blocks:
        q_num = int(num_str)
        lines = [l.strip() for l in content.strip().splitlines() if l.strip()]
        ans_line = lines[0] if lines else ''
        ans_line = re.sub(r'\*+', '', ans_line).strip()
        
        exp_text = ''
        exp_match = re.search(r'\*\*Giải thích:\*\*\s*(.*)', content, re.DOTALL)
        if exp_match:
            exp_text = exp_match.group(1).strip()
            exp_text = re.sub(r'^\s*\*+\s*', '', exp_text).strip()
            exp_text = re.sub(r'\n{3,}', '\n\n', exp_text)
        
        ans_key = ''
        ans_lower = ans_line.lower()
        if ans_lower.startswith('a'): ans_key = 'a'
        elif ans_lower.startswith('b'): ans_key = 'b'
        elif ans_lower.startswith('c'): ans_key = 'c'
        elif ans_lower.startswith('d'): ans_key = 'd'
        elif 'đúng' in ans_lower or 'true' in ans_lower: ans_key = 'True'
        elif 'sai' in ans_lower or 'false' in ans_lower: ans_key = 'False'
        
        answers[q_num] = {
            'ans_line': ans_line,
            'ans_key': ans_key,
            'explanation': exp_text
        }
    return answers

def build_quiz_dataset():
    answers = parse_da()
    b64_images = get_base64_images()
    
    with open('DeThiThu_extracted.txt', encoding='utf-8') as f:
        raw_text = f.read()

    clean_text = re.sub(r'=== PAGE \d+ ===\n?', '', raw_text)

    q_spans = {}
    for i in range(2, 51):
        m = re.search(rf'Câu hỏi\s+{i}\s*\n\s*Chưa trả lời', clean_text)
        if m:
            q_spans[i] = m.start()

    questions = []

    for i in range(1, 51):
        if i == 1:
            q_text_block = clean_text[:q_spans[2]]
        elif i == 50:
            q_text_block = clean_text[q_spans[50]:]
        else:
            q_text_block = clean_text[q_spans[i]:q_spans[i+1]]

        prompt_block = q_text_block
        prompt_block = re.sub(rf'^Câu hỏi\s+{i}\s*\n\s*Chưa trả lời\s*\n\s*Đặt cờ\s*\n\s*Đoạn văn câu hỏi\s*\n', '', prompt_block.strip())
        
        choice_split = re.search(rf'Câu hỏi\s+{i}\s*(?:Select one:|Trả lời)', prompt_block)
        if not choice_split:
            choice_split = re.search(r'(?:Select one:|Trả lời)', prompt_block)
            
        if choice_split:
            prompt = prompt_block[:choice_split.start()].strip()
            choices_raw = prompt_block[choice_split.end():].strip()
        else:
            prompt = prompt_block.strip()
            choices_raw = ""

        choices = []
        if i == 50:
            choices = [
                {"key": "True", "text": "Đúng (True)"},
                {"key": "False", "text": "Sai (False)"}
            ]
        else:
            parts = re.split(r'\n(?=[a-d]\.\s*)', '\n' + choices_raw)
            for part in parts:
                part = part.strip()
                if not part: continue
                m_opt = re.match(r'^([a-d])\.\s*(.*)', part, re.DOTALL)
                if m_opt:
                    opt_key = m_opt.group(1).strip()
                    opt_val = m_opt.group(2).strip()
                    opt_val = re.sub(r'\s+', ' ', opt_val)
                    choices.append({"key": opt_key, "text": opt_val})

        q_ans = answers.get(i, {})
        
        # Clean prompt lines: normalize spaces
        prompt = "\n".join([line.strip() for line in prompt.splitlines() if line.strip()])

        img_relative = IMAGE_FILES.get(i, None)
        img_b64 = b64_images.get(i, None)

        questions.append({
            "id": i,
            "topic": TOPICS.get(i, "Quản trị hệ thống"),
            "prompt": prompt,
            "choices": choices,
            "answer": q_ans.get("ans_key", ""),
            "answer_text": q_ans.get("ans_line", ""),
            "explanation": q_ans.get("explanation", ""),
            "image": img_relative,
            "imageBase64": img_b64,
            "points": 0.2
        })

    quiz_info = {
        "title": "Đề thi thử Quản trị hệ thống (Linux / CentOS)",
        "code": "CO3013 / IT3010",
        "system": "Hệ thống Quản lý Học tập & Thi Trực tuyến ELSE (BK-LMS)",
        "department": "Khoa Khoa học & Kỹ thuật Máy tính",
        "term": "Học kỳ 2 / Năm học 2025 - 2026",
        "description": "Đề thi trắc nghiệm gồm 50 câu hỏi bao quát toàn diện kiến thức Quản trị hệ thống: Hệ điều hành Linux/CentOS, Quản lý tiến trình & Daemon, Cấu hình mạng & Tường lửa, Quản lý tài khoản & Phân quyền, Hệ thống tập tin & Phân vùng.",
        "durationMinutes": 50,
        "totalQuestions": 50,
        "maxScore": 10.0,
        "passingScore": 5.0,
        "questions": questions
    }
    
    return quiz_info

if __name__ == '__main__':
    data = build_quiz_dataset()
    with open('quiz-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Saved quiz-data.json")

    with open('quiz-data.js', 'w', encoding='utf-8') as f:
        f.write("/* Quiz dataset for ELSE / LMS Web Application */\n")
        f.write("window.QUIZ_DATA = ")
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print("Saved quiz-data.js")
