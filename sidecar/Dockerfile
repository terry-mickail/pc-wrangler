FROM python:3.12-slim

# git: to pip-install the pinned py-cord branch. libopus0: voice decode (used from Stage 2).
RUN apt-get update && apt-get install -y --no-install-recommends \
      git libopus0 ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pinned py-cord fix/voice-rec-2 branch (the one that receives DAVE audio),
# with the [voice] extra pulling PyNaCl + davey.
RUN pip install --no-cache-dir \
      "py-cord[voice] @ git+https://github.com/Pycord-Development/pycord@fix/voice-rec-2" \
      "httpx>=0.27"

COPY sidecar.py .

# -u so logs stream to Fly in real time.
CMD ["python", "-u", "sidecar.py"]
