import sys
import os
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

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

def parse_all():
    answers = parse_da()
    with open('DeThiThu_extracted.txt', encoding='utf-8') as f:
        raw_text = f.read()

    # Remove page delimiters
    clean_text = re.sub(r'=== PAGE \d+ ===\n?', '', raw_text)

    # Let's inspect splitting by questions
    # Note that Question 1 doesn't have "Câu hỏi 1 \n Chưa trả lời \n Đặt cờ \n Đoạn văn câu hỏi" at the very beginning,
    # it begins directly with "Tập tin nào sau đây..." then "Câu hỏi 1Select one: \n a. \n ... \n d. \n ... \n Câu hỏi 2"
    
    questions = []
    
    # Let's write a targeted extractor for each question from 1 to 50
    # Map of images
    image_map = {
        2: "page_1_Image26.png",
        3: "page_2_Image30.png",
        7: "page_3_Image34.png",
        17: "page_8_Image51.png",
        18: "page_8_Image52.png",
        21: "page_9_Image55.png",
        22: "page_10_Image59.png",
        39: "page_17_Image76.png"
    }

    # Find the start indices for each question
    # For Q1: 0 to start of Q2
    # For Q >= 2: "Câu hỏi {i}\s*\n\s*Chưa trả lời"
    q_spans = {}
    for i in range(2, 51):
        m = re.search(rf'Câu hỏi\s+{i}\s*\n\s*Chưa trả lời', clean_text)
        if m:
            q_spans[i] = m.start()
        else:
            print(f"Warning: Could not find start of Q{i}")

    for i in range(1, 51):
        if i == 1:
            q_text_block = clean_text[:q_spans[2]]
        elif i == 50:
            q_text_block = clean_text[q_spans[50]:]
        else:
            q_text_block = clean_text[q_spans[i]:q_spans[i+1]]
            
        # Parse q_text_block
        # It typically contains:
        # Prompt
        # Câu hỏi {i}(Select one:|Trả lời)
        # choices: a., b., c., d. or Đúng / Sai
        
        # Remove "Câu hỏi {i} \n Chưa trả lời \n Đặt cờ \n Đoạn văn câu hỏi"
        prompt_block = q_text_block
        prompt_block = re.sub(rf'^Câu hỏi\s+{i}\s*\n\s*Chưa trả lời\s*\n\s*Đặt cờ\s*\n\s*Đoạn văn câu hỏi\s*\n', '', prompt_block.strip())
        
        # Find where choices start: "Câu hỏi {i}Select one:" or "Câu hỏi {i}Trả lời"
        choice_split = re.search(rf'Câu hỏi\s+{i}\s*(?:Select one:|Trả lời)', prompt_block)
        if not choice_split:
            # fallback
            choice_split = re.search(r'(?:Select one:|Trả lời)', prompt_block)
            
        if choice_split:
            prompt = prompt_block[:choice_split.start()].strip()
            choices_raw = prompt_block[choice_split.end():].strip()
        else:
            prompt = prompt_block.strip()
            choices_raw = ""

        # Parse choices
        choices = []
        if i == 50:
            choices = [
                {"key": "True", "text": "Đúng (True)"},
                {"key": "False", "text": "Sai (False)"}
            ]
        else:
            # Match a. ... b. ... c. ... d. ...
            # Note: in extracted text: "a. \n option text \n b. \n option text ..."
            parts = re.split(r'\n(?=[a-d]\.\s*)', '\n' + choices_raw)
            for part in parts:
                part = part.strip()
                if not part: continue
                m_opt = re.match(r'^([a-d])\.\s*(.*)', part, re.DOTALL)
                if m_opt:
                    opt_key = m_opt.group(1).strip()
                    opt_val = m_opt.group(2).strip()
                    # Clean up trailing spaces or newlines
                    opt_val = re.sub(r'\s+', ' ', opt_val)
                    choices.append({"key": opt_key, "text": opt_val})

        q_ans = answers.get(i, {})
        
        questions.append({
            "id": i,
            "prompt": prompt,
            "choices": choices,
            "correct_key": q_ans.get("ans_key", ""),
            "correct_line": q_ans.get("ans_line", ""),
            "explanation": q_ans.get("explanation", ""),
            "image": image_map.get(i, None)
        })

    return questions

if __name__ == '__main__':
    qs = parse_all()
    print(f"Extracted {len(qs)} questions successfully.")
    for q in [qs[0], qs[1], qs[6], qs[21], qs[49]]:
        print("="*60)
        print(f"ID: {q['id']}")
        print(f"Prompt: {q['prompt']}")
        print(f"Image: {q['image']}")
        for c in q['choices']:
            print(f"  [{c['key']}]: {c['text']}")
        print(f"Correct: {q['correct_key']} -> {q['correct_line']}")
        print(f"Explanation: {q['explanation']}")



