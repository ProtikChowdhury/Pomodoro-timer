import base64
import os

input_file = "audio/light-rain-109591.mp3"
output_file = "rain_sound.js"

if not os.path.exists(input_file):
    print(f"Error: {input_file} not found")
    exit(1)

with open(input_file, "rb") as f:
    audio_data = f.read()
    base64_data = base64.b64encode(audio_data).decode('utf-8')

# Write to JS file
js_content = f'const RAIN_SOUND_BASE64 = "{base64_data}";'

with open(output_file, "w") as f:
    f.write(js_content)

print(f"Successfully created {output_file} ({len(js_content) / 1024 / 1024:.2f} MB)")
