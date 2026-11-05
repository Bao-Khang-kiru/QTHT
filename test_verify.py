import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('assets/js/quiz-data.js', encoding='utf-8') as f:
    js_content = f.read()

# remove 'window.QUIZ_DATA = ' and ';'
json_str = js_content.split('window.QUIZ_DATA = ', 1)[1].rsplit(';', 1)[0]
data = json.loads(json_str)

print('Quiz Title:', data['title'])
print('Total Questions in dataset:', len(data['questions']))

# Check all IDs 1..50
ids = [q['id'] for q in data['questions']]
assert ids == list(range(1, 51)), 'Question IDs not 1..50'

# Check all choices
for q in data['questions']:
    assert len(q['choices']) in [2, 4], f"Q{q['id']} invalid choices count {len(q['choices'])}"
    assert q['answer'], f"Q{q['id']} missing answer"
    assert q['explanation'], f"Q{q['id']} missing explanation"

print('All 50 questions verified successfully!')
