# Generates the Hebrew narration lines with Google Cloud Text-to-Speech.
import json, sys, base64, urllib.request

VOICE = sys.argv[1] if len(sys.argv) > 1 else 'he-IL-Chirp3-HD-Algieba'
LINES = json.load(open('script.json'))

for i, line in enumerate(LINES):
    body = {
        'input': {'text': line['text']},
        'voice': {'languageCode': 'he-IL', 'name': VOICE},
        'audioConfig': {'audioEncoding': 'LINEAR16', 'sampleRateHertz': 48000, 'speakingRate': line.get('rate', 0.88)},
    }
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    data = json.load(urllib.request.urlopen(req))
    open(f'audio/line{i}.wav', 'wb').write(base64.b64decode(data['audioContent']))
    print('ok', i)
