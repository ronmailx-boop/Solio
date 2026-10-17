#!/bin/sh
# Mixes narration + soft pad and encodes the 1080x1920 explainer.
# Usage: sh promo/build.sh <frames-dir> <out.mp4>   (run from promo/)
set -e
FR="$1"; OUT="${2:-solio-explainer.mp4}"; T=30
D0=$(python3 -c "import json;print(','.join(str(int(l['start']*1000)) for l in json.load(open('timeline.json'))['lines']))")
D4=$(echo "$D0" | cut -d, -f5)
set -- $(echo "$D0" | cut -d, -f1-4 | tr ',' ' ') "$FR" "$OUT"
ffmpeg -v error -y -framerate 30 -i "$5/f%04d.png" \
  -i audio/trim0.wav -i audio/trim1.wav -i audio/trim2.wav -i audio/trim3.wav -i audio/trim4.wav \
  -f lavfi -i "sine=f=73.42:d=$T" -f lavfi -i "sine=f=110:d=$T" -f lavfi -i "sine=f=146.83:d=$T" \
  -f lavfi -i "anoisesrc=color=brown:d=$T:a=0.5" \
  -filter_complex "
    [1]adelay=$1|$1[v0];[2]adelay=$2|$2[v1];[3]adelay=$3|$3[v2];[4]adelay=$4|$4[v3];[5]adelay=${D4}|${D4}[v4];
    [v0][v1][v2][v3][v4]amix=inputs=5:normalize=0,aresample=48000,highpass=f=70,acompressor=threshold=-20dB:ratio=3,volume=1.6[voice];
    [6]volume=0.5[s1];[7]volume=0.35[s2];[8]volume=0.12[s3];
    [s1][s2][s3]amix=inputs=3:normalize=0,lowpass=f=600,tremolo=f=0.1:d=0.25,volume=0.09[pad];
    [9]lowpass=f=520,highpass=f=90,tremolo=f=0.1:d=0.7,volume=0.35[wash];
    [pad][wash]amix=inputs=2:normalize=0,aresample=48000,afade=t=in:d=2,afade=t=out:st=$((T-3)):d=3[bed];
    [voice][bed]amix=inputs=2:normalize=0,alimiter=limit=0.89,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -t $T -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 30 \
  -vf "fade=t=in:d=0.6,fade=t=out:st=$((T-1)).2:d=0.8" -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$6"
