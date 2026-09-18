import json

with open(r'C:\Users\ADMIN\.gemini\antigravity-ide\brain\46729ec4-5892-478b-94bf-7d3a21dfa1fc\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8', errors='ignore') as f:
    for i, line in enumerate(f):
        if i in [189, 201]:
            data = json.loads(line)
            calls = data.get('tool_calls', [])
            for c in calls:
                print(f"=== STEP {i} ===")
                args = c.get('args', {})
                print("Instruction:", args.get('Instruction'))
                chunks = args.get('ReplacementChunks', [])
                if not chunks and 'ReplacementContent' in args:
                    chunks = [args]
                for idx, chunk in enumerate(chunks):
                    print(f"--- CHUNK {idx} ---")
                    print("TargetContent:\n", chunk.get('TargetContent'))
                    print("ReplacementContent:\n", chunk.get('ReplacementContent'))
