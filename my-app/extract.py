import json

with open(r'C:\Users\ADMIN\.gemini\antigravity-ide\brain\46729ec4-5892-478b-94bf-7d3a21dfa1fc\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

steps_to_extract = [34, 45, 115, 132, 157, 179, 189, 201]

with open('extracted_ui_changes.txt', 'w', encoding='utf-8') as out:
    for s in steps_to_extract:
        if s < len(lines):
            try:
                data = json.loads(lines[s])
                calls = data.get('tool_calls', [])
                for c in calls:
                    args = c.get('args', {})
                    out.write(f"\n==================== STEP {s} ====================\n")
                    out.write(f"Instruction: {args.get('Instruction', args.get('Description'))}\n")
                    chunks = args.get('ReplacementChunks', [])
                    if not chunks and 'ReplacementContent' in args:
                        chunks = [args]
                    for idx, ch in enumerate(chunks):
                        out.write(f"\n--- Chunk {idx} ---\n")
                        out.write("TARGET:\n" + ch.get('TargetContent', '') + "\n")
                        out.write("REPLACEMENT:\n" + ch.get('ReplacementContent', '') + "\n")
            except Exception as e:
                out.write(f"Error reading step {s}: {e}\n")

print("Done extracting UI changes.")
