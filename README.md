# Foco em Dia — Detector de Procrastinação

Aplicação web simples que usa um modelo de pose do Teachable Machine para classificar a postura como **procrastinando** ou **trabalhando**. Quando a classificação de procrastinação permanece ativa por 30 segundos, a página emite um alarme sonoro.

## Estrutura

```text
anti_procrastinacao_pose/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── model/
    ├── metadata.json
    ├── model.json
    └── weights.bin
```

## Como executar

Não abra o `index.html` por duplo clique, pois o navegador pode bloquear o carregamento do modelo por `file://`.

Abra um terminal dentro da pasta do projeto e execute:

```bash
python -m http.server 8080
```

Depois, acesse:

```text
http://localhost:8080
```

Outra opção é abrir a pasta no VS Code e usar a extensão **Live Server**.

## Ajustes rápidos

No arquivo `js/app.js`:

- `ALARM_AFTER_MS = 30_000` define o tempo até o alarme.
- `MIN_CONFIDENCE = 0.75` define a confiança mínima para considerar uma classificação válida.
- `playAlarmTone()` controla o som do alerta.

## Observações

- É necessário autorizar o uso da webcam.
- O áudio é habilitado após o clique em “Iniciar câmera”, pois navegadores bloqueiam sons automáticos sem interação.
- O projeto usa CDNs do TensorFlow.js e do Teachable Machine, portanto precisa de conexão com a internet para carregar essas bibliotecas.
