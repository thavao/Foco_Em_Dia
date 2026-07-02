const MODEL_BASE_URL = "./model/";
const CAMERA_SIZE = 360;
const ALARM_AFTER_MS = 30_000;
const MIN_CONFIDENCE = 0.75;

let model;
let webcam;
let canvasContext;
let isRunning = false;
let animationFrameId = null;
let procrastinationStartedAt = null;
let alarmIntervalId = null;
let alarmIsPlaying = false;
let audioContext = null;

const elements = {
  startButton: document.getElementById("startButton"),
  stopButton: document.getElementById("stopButton"),
  cameraCanvas: document.getElementById("cameraCanvas"),
  cameraLabel: document.getElementById("cameraLabel"),
  cameraPlaceholder: document.getElementById("cameraPlaceholder"),
  liveDot: document.querySelector(".live-dot"),
  statusCard: document.getElementById("statusCard"),
  statusText: document.getElementById("statusText"),
  statusDetail: document.getElementById("statusDetail"),
  timerValue: document.getElementById("timerValue"),
  timerProgress: document.getElementById("timerProgress"),
  procrastinatingConfidence: document.getElementById("procrastinatingConfidence"),
  workingConfidence: document.getElementById("workingConfidence"),
  procrastinatingBar: document.getElementById("procrastinatingBar"),
  workingBar: document.getElementById("workingBar"),
  modelState: document.getElementById("modelState"),
  message: document.getElementById("message")
};

elements.startButton.addEventListener("click", startMonitoring);
elements.stopButton.addEventListener("click", stopMonitoring);

async function startMonitoring() {
  if (isRunning) return;

  setMessage("Carregando modelo e solicitando acesso à câmera...");
  elements.startButton.disabled = true;
  elements.startButton.textContent = "Iniciando...";

  try {
    // Criar/resumir o contexto de áudio dentro de um clique do usuário.
    // Isso evita bloqueios comuns de som pelos navegadores.
    initializeAudio();

    if (!model) {
      const modelURL = `${MODEL_BASE_URL}model.json`;
      const metadataURL = `${MODEL_BASE_URL}metadata.json`;
      model = await tmPose.load(modelURL, metadataURL);
    }

    webcam = new tmPose.Webcam(CAMERA_SIZE, CAMERA_SIZE, true);
    await webcam.setup({ facingMode: "user" });
    await webcam.play();

    const canvas = elements.cameraCanvas;
    canvas.width = CAMERA_SIZE;
    canvas.height = CAMERA_SIZE;
    canvasContext = canvas.getContext("2d");

    isRunning = true;
    elements.cameraPlaceholder.classList.add("is-hidden");
    elements.cameraLabel.textContent = "Câmera ativa";
    elements.liveDot.classList.add("is-live");
    elements.stopButton.disabled = false;
    elements.startButton.textContent = "Câmera ativa";
    elements.modelState.textContent = "Analisando";
    setMessage("Monitoramento em andamento. O contador só avança em “procrastinando”.");

    loop();
  } catch (error) {
    console.error(error);
    setMessage(getCameraErrorMessage(error), true);
    resetInterfaceAfterStop();
  }
}

async function loop() {
  if (!isRunning) return;

  webcam.update();
  await predictAndRender();

  if (isRunning) {
    animationFrameId = window.requestAnimationFrame(loop);
  }
}

async function predictAndRender() {
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  const predictions = await model.predict(posenetOutput);

  drawPose(pose);
  updateConfidence(predictions);

  const result = getCurrentClassification(predictions);
  updateStatus(result);
}

function drawPose(pose) {
  canvasContext.drawImage(webcam.canvas, 0, 0);

  if (!pose) return;

  const minPartConfidence = 0.5;
  tmPose.drawKeypoints(pose.keypoints, minPartConfidence, canvasContext);
  tmPose.drawSkeleton(pose.keypoints, minPartConfidence, canvasContext);
}

function getCurrentClassification(predictions) {
  const procrastinating = predictions.find((item) =>
    normalize(item.className).includes("procrastin")
  );

  const working = predictions.find((item) =>
    normalize(item.className).includes("trabalh")
  );

  const topPrediction = predictions.reduce((best, current) =>
    current.probability > best.probability ? current : best
  );

  // Só considera um estado válido quando há confiança mínima.
  if (topPrediction.probability < MIN_CONFIDENCE) {
    return { state: "uncertain", confidence: topPrediction.probability };
  }

  if (procrastinating && topPrediction.className === procrastinating.className) {
    return { state: "procrastinating", confidence: procrastinating.probability };
  }

  if (working && topPrediction.className === working.className) {
    return { state: "working", confidence: working.probability };
  }

  return { state: "uncertain", confidence: topPrediction.probability };
}

function updateStatus(result) {
  if (result.state === "procrastinating") {
    if (!procrastinationStartedAt) {
      procrastinationStartedAt = Date.now();
    }

    const elapsed = Date.now() - procrastinationStartedAt;
    const shouldAlarm = elapsed >= ALARM_AFTER_MS;

    setStatus(
      shouldAlarm ? "status-alarm" : "status-procrastinating",
      shouldAlarm ? "Alarme: procrastinação contínua" : "Procrastinando",
      shouldAlarm
        ? "Você ficou mais de 30 segundos nesse estado. Retome o foco para parar o alarme."
        : `Confiança atual: ${(result.confidence * 100).toFixed(0)}%.`
    );

    updateTimer(elapsed);

    if (shouldAlarm) {
      startAlarm();
    }

    return;
  }

  // Trabalhando ou sem confiança suficiente interrompe o contador e o alarme.
  procrastinationStartedAt = null;
  stopAlarm();
  updateTimer(0);

  if (result.state === "working") {
    setStatus(
      "status-working",
      "Trabalhando",
      `Confiança atual: ${(result.confidence * 100).toFixed(0)}%. Bom foco!`
    );
    return;
  }

  setStatus(
    "status-idle",
    "Leitura incerta",
    `Ajuste sua posição ou iluminação. Confiança atual: ${(result.confidence * 100).toFixed(0)}%.`
  );
}

function updateConfidence(predictions) {
  const procrastinating = predictions.find((item) =>
    normalize(item.className).includes("procrastin")
  );

  const working = predictions.find((item) =>
    normalize(item.className).includes("trabalh")
  );

  const procrastinatingValue = Math.round((procrastinating?.probability ?? 0) * 100);
  const workingValue = Math.round((working?.probability ?? 0) * 100);

  elements.procrastinatingConfidence.textContent = `${procrastinatingValue}%`;
  elements.workingConfidence.textContent = `${workingValue}%`;
  elements.procrastinatingBar.style.width = `${procrastinatingValue}%`;
  elements.workingBar.style.width = `${workingValue}%`;
}

function setStatus(statusClass, title, detail) {
  elements.statusCard.className = `status-card ${statusClass}`;
  elements.statusText.textContent = title;
  elements.statusDetail.textContent = detail;
}

function updateTimer(elapsedMs) {
  const cappedElapsed = Math.min(elapsedMs, ALARM_AFTER_MS);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  elements.timerValue.textContent = `${minutes}:${seconds}`;
  elements.timerProgress.style.width = `${(cappedElapsed / ALARM_AFTER_MS) * 100}%`;
}

function initializeAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("Seu navegador não suporta áudio para o alarme.");
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function startAlarm() {
  if (alarmIsPlaying) return;

  alarmIsPlaying = true;
  playAlarmTone();
  alarmIntervalId = window.setInterval(playAlarmTone, 900);
}

function stopAlarm() {
  alarmIsPlaying = false;

  if (alarmIntervalId) {
    window.clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

function playAlarmTone() {
  if (!audioContext || audioContext.state !== "running") return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(740, now);
  oscillator.frequency.setValueAtTime(980, now + 0.15);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.11, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.36);
}

function stopMonitoring() {
  isRunning = false;
  window.cancelAnimationFrame(animationFrameId);

  if (webcam) {
    webcam.stop();
    webcam = null;
  }

  stopAlarm();
  procrastinationStartedAt = null;
  updateTimer(0);

  const context = elements.cameraCanvas.getContext("2d");
  context.clearRect(0, 0, elements.cameraCanvas.width, elements.cameraCanvas.height);

  resetInterfaceAfterStop();
  setMessage("Câmera desligada. Clique em “Iniciar câmera” para retomar.");
}

function resetInterfaceAfterStop() {
  isRunning = false;
  elements.cameraPlaceholder.classList.remove("is-hidden");
  elements.cameraLabel.textContent = "Câmera desligada";
  elements.liveDot.classList.remove("is-live");
  elements.startButton.disabled = false;
  elements.startButton.textContent = "Iniciar câmera";
  elements.stopButton.disabled = true;
  elements.modelState.textContent = "Aguardando";

  setStatus(
    "status-idle",
    "Aguardando câmera",
    "O modelo ainda não está analisando uma pose."
  );
}

function setMessage(text, isError = false) {
  elements.message.textContent = text;
  elements.message.classList.toggle("is-error", isError);
}

function getCameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") {
    return "A câmera foi bloqueada. Autorize o acesso à webcam nas permissões do navegador.";
  }

  if (error?.name === "NotFoundError") {
    return "Nenhuma câmera foi encontrada neste dispositivo.";
  }

  if (error?.message?.includes("Failed to fetch")) {
    return "Não foi possível carregar o modelo. Abra este projeto por um servidor local, e não diretamente por file://.";
  }

  return "Não foi possível iniciar o monitoramento. Veja o console do navegador para mais detalhes.";
}

function normalize(value) {
  return String(value)
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
