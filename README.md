# Foco em Dia

Aplicação web local para monitoramento de foco por câmera, utilizando inteligência artificial no navegador.

O sistema analisa sinais visuais como presença do rosto, direção da cabeça, olhar para baixo, rosto fora do enquadramento e possível uso de celular. Quando um sinal de distração permanece ativo por tempo contínuo, a aplicação inicia uma contagem e dispara um alarme após o tempo configurado.

> Importante: o sistema não determina com certeza se uma pessoa está trabalhando ou procrastinando. Ele identifica sinais visuais que podem indicar distração, ausência ou perda de atenção.

---

## Funcionalidades

* Acesso à câmera do usuário pelo navegador.
* Processamento local de vídeo, sem envio de imagens para servidor próprio.
* Detecção facial em tempo real.
* Calibração inicial da posição normal do usuário.
* Identificação de:

  * rosto ausente;
  * rosto fora do enquadramento;
  * cabeça virada lateralmente;
  * cabeça inclinada para baixo;
  * possível celular visível na câmera.
* Score visual de foco entre 0 e 100.
* Temporizador de distração contínua.
* Alarme sonoro após 30 segundos de distração.
* Exibição visual dos pontos principais do rosto.
* Destaque visual para possível celular detectado.

---

## Tecnologias utilizadas

* HTML5
* CSS3
* JavaScript puro
* MediaPipe Tasks Vision
* Face Landmarker
* Object Detector
* Web Audio API
* MediaDevices API (`getUserMedia`)

---

## Estrutura do projeto

```text
foco-em-dia/
├── index.html
├── css/
│   └── style.css
└── js/
    └── app.js
```

### Responsabilidade de cada arquivo

| Arquivo         | Responsabilidade                                             |
| --------------- | ------------------------------------------------------------ |
| `index.html`    | Estrutura visual da aplicação                                |
| `css/style.css` | Estilos, layout, indicadores e responsividade                |
| `js/app.js`     | Câmera, MediaPipe, regras de foco, timer, alarme e interface |

---

## Como executar

A aplicação deve ser aberta por um servidor local. Não abra o arquivo `index.html` diretamente pelo explorador de arquivos.

### Opção 1: Python

No terminal, dentro da pasta do projeto:

```bash
py -m http.server 8080
```

Depois abra no navegador:

```text
http://localhost:8080
```

### Opção 2: Visual Studio Code

Instale a extensão **Live Server** e abra o arquivo `index.html` usando a opção:

```text
Open with Live Server
```

---

## Permissões necessárias

Ao iniciar o monitoramento, o navegador solicitará acesso à webcam.

Permita a câmera para o endereço:

```text
http://localhost:8080
```

Caso a permissão tenha sido bloqueada:

1. Clique no ícone de cadeado ao lado da URL.
2. Localize a permissão de câmera.
3. Selecione “Permitir”.
4. Recarregue a página.

---

## Como utilizar

1. Abra a aplicação em `http://localhost:8080`.
2. Clique em **Iniciar monitoramento**.
3. Autorize o acesso à câmera.
4. Fique olhando normalmente para a tela durante alguns segundos.
5. Aguarde a calibração chegar a 100%.
6. Use a aplicação normalmente.

Durante a calibração, o sistema registra uma referência aproximada da posição normal da sua cabeça e do seu olhar.

---

## Lógica de monitoramento

A aplicação utiliza uma combinação de regras para evitar que um único movimento gere um alarme indevido.

### Estados principais

| Estado                      | Descrição                                                                         |
| --------------------------- | --------------------------------------------------------------------------------- |
| Foco provável               | Rosto presente, postura dentro da referência e sem sinais relevantes de distração |
| Calibrando postura          | O sistema está aprendendo a posição normal do usuário                             |
| Olhando para o lado         | Cabeça lateralmente desviada por alguns segundos                                  |
| Olhando para baixo          | Inclinação da cabeça combinada com direção dos olhos para baixo                   |
| Rosto fora do enquadramento | Usuário permanece próximo às bordas da câmera                                     |
| Pessoa ausente              | Rosto não identificado por tempo prolongado                                       |
| Possível uso de celular     | Detector de objetos identifica algo classificado como celular                     |

---

## Alarme de distração

O temporizador é iniciado quando algum sinal de distração permanece ativo.

Exemplos:

* rosto ausente;
* cabeça baixa;
* rosto lateral por muito tempo;
* rosto fora da câmera;
* possível celular detectado.

Quando a distração permanece por mais de 30 segundos, o sistema ativa um alarme sonoro.

O contador é zerado quando o sistema volta a identificar uma condição provável de foco.

---

## Configurações importantes

As principais configurações ficam no início do arquivo:

```text
js/app.js
```

Exemplo:

```javascript
const CONFIG = {
  alarmAfterMs: 30_000,
  headTurnHoldMs: 3_500,
  headDownHoldMs: 2_500,
  headYawToleranceDeg: 18,
  headDownPitchDeg: 10,
  eyeDownDelta: 0.12
};
```

### Ajustes recomendados

#### Alterar o tempo para disparar o alarme

```javascript
alarmAfterMs: 30_000
```

Exemplo para 1 minuto:

```javascript
alarmAfterMs: 60_000
```

#### Deixar a detecção de cabeça baixa mais sensível

```javascript
headDownPitchDeg: 7,
eyeDownDelta: 0.08,
headDownHoldMs: 1_500
```

#### Reduzir falsos positivos ao olhar para baixo

```javascript
headDownPitchDeg: 14,
eyeDownDelta: 0.18,
headDownHoldMs: 4_000
```

#### Corrigir direção invertida da cabeça

Em algumas webcams, dependendo da altura e do ângulo da câmera, olhar para cima pode ser interpretado como olhar para baixo.

Altere:

```javascript
pitchDirection: 1
```

Para:

```javascript
pitchDirection: -1
```

---

## Recomendações para melhor funcionamento

* Posicione a câmera aproximadamente na altura dos olhos.
* Mantenha o rosto bem iluminado.
* Deixe rosto e ombros visíveis.
* Evite fundos muito escuros.
* Aguarde a calibração terminar antes de testar.
* Não mova a câmera durante a sessão.
* Feche aplicações que possam estar usando a webcam, como Teams, Discord, Zoom ou OBS.

---

## Limitações conhecidas

### Monitoramento em outra aba

Atualmente, a aplicação funciona melhor enquanto a aba permanece ativa.

Navegadores costumam reduzir ou pausar animações, timers e processamento de vídeo em abas que ficam em segundo plano. Por isso, o monitoramento pode perder precisão ou parar quando o usuário muda para outra aba.

A solução planejada para uma próxima versão é transformar o projeto em uma extensão para Chrome ou Edge usando:

```text
Chrome Extension Manifest V3
+
Offscreen Document
+
MediaPipe em segundo plano
```

Essa arquitetura permitirá manter a câmera e a análise funcionando enquanto o usuário utiliza outras abas do navegador.

### Detecção de celular

O detector de celular usa um modelo genérico de detecção de objetos. Ele pode falhar em situações como:

* celular muito distante;
* iluminação baixa;
* celular parcialmente encoberto;
* câmera com baixa resolução;
* objeto parecido com um celular.

Por isso, a interface utiliza o termo:

```text
Possível uso de celular
```

e não uma confirmação absoluta.

### Privacidade

A aplicação foi projetada para processar a imagem da webcam localmente no navegador.

A câmera é utilizada apenas enquanto o monitoramento está ativo. Ao clicar em parar, o stream da webcam é encerrado.

Ainda assim, os modelos do MediaPipe são carregados por CDN, portanto é necessário acesso à internet na primeira execução ou sempre que o navegador não possuir os arquivos em cache.

---

## Próximas melhorias planejadas

* Transformar em extensão Chrome/Edge.
* Manter o monitoramento ativo em segundo plano.
* Adicionar notificações nativas do navegador.
* Permitir configurar os tempos de alerta pela interface.
* Criar histórico de sessões e tempo de foco.
* Adicionar modo pausa.
* Adicionar botão para recalibrar a postura.
* Melhorar a detecção de celular com modelo especializado.
* Criar perfis de sensibilidade.
* Gerar relatórios simples de foco diário e semanal.

---

## Aviso

Este projeto possui finalidade educacional e experimental.

O score de foco é uma estimativa baseada em sinais visuais. Ele não deve ser usado para fiscalização, controle profissional, decisões trabalhistas, punições ou qualquer situação que exija avaliação humana confiável.
