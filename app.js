const view = {
    p1Button: document.querySelector('#p1Button'),
    p2Button: document.querySelector('#p2Button'),
    startServingSelect: document.querySelector("#startServing"),

    p1Display: document.querySelector('#p1Display'),
    p2Display: document.querySelector('#p2Display'),
    statusDisplay: document.querySelector('#servingDisplay'),
}

const controls = {
    resetButton: document.querySelector('#reset'),
    winningScoreSelect: document.querySelector('#playTo'),
    player1NameInput: document.querySelector("#player1Name"),
    player2NameInput: document.querySelector("#player2Name"),
    enabledSoundSelect: document.querySelector("#enabledSound")
}

const winningPhrase = " is a winner"
const servingPhrase = " is serving"
const numberOfServesMap = { 11: 2, 21: 5 }
const playersColors = ["#0d6efd", "#dc3545"] // Blue, Red
const playerColorName = ["Blue", "Red"]

const state = {
    playersScore: [0, 0],

    winningScore: 11,
    numberOfServes: 2,
    startingPlayer: 0,
    isSoundEnabled: true,
    playersName: ["Player 1", "Player 2"],

    isGameOver: function () {
        return checkWinner() != -1
    },
}

let audioContext = null
let announcers = []

window.onload = onLoad;

function onLoad() {
    reset()

    fetch('https://raw.githubusercontent.com/alexchern0v/PingPongTracker/master/sounds/female.json')
        .then(response => response.json())
        .then(data => {
            announcers.push(data.res)
        })
        .catch(error => {
            console.error('Error:', error);
        });
    fetch('https://raw.githubusercontent.com/alexchern0v/PingPongTracker/master/sounds/male.json')
        .then(response => response.json())
        .then(data => {
            announcers.push(data.res)
        })
        .catch(error => {
            console.error('Error:', error);
        });

    audioContext = new AudioContext();
}

function whoServe() {
    totalScore = state.playersScore[0] + state.playersScore[1]

    if (totalScore >= ((state.winningScore * 2) - 2)) {
        return (totalScore + state.startingPlayer) % 2
    }

    return (parseInt(totalScore / state.numberOfServes) + state.startingPlayer) % 2
}


function checkWinner() {
    if (state.playersScore[0] >= state.winningScore && state.playersScore[0] - state.playersScore[1] > 1) {
        return 0
    }
    if (state.playersScore[1] >= state.winningScore && state.playersScore[1] - state.playersScore[0] > 1) {
        return 1
    }

    return -1
}

function addScoreToPlayer(player) {
    if (state.isGameOver()) {
        reset()
        return
    }

    state.playersScore[player] += 1;

    render()
}

document.addEventListener('keydown', function (event) {
    // Get the key code
    var keyCode = event.keyCode || event.which;
    console.log(keyCode);
    // Handle specific key presses
    if (keyCode === 37) {
        addScoreToPlayer(0)
    } else if (keyCode === 39) {
        addScoreToPlayer(1)
    }
});

view.p1Button.addEventListener('click', function () {
    addScoreToPlayer(0)
});

view.p2Button.addEventListener('click', function () {
    addScoreToPlayer(1)
});

function updateNames() {
    state.playersName = [controls.player1NameInput.value, controls.player2NameInput.value]

    render()
}

function render() {
    view.p1Button.textContent = "+1 " + state.playersName[0];
    view.p2Button.textContent = "+1 " + state.playersName[1];
    view.startServingSelect.options[0].textContent = state.playersName[0]
    view.startServingSelect.options[1].textContent = state.playersName[1]

    view.p1Display.textContent = state.playersScore[0];
    view.p2Display.textContent = state.playersScore[1];

    servingPlayer = whoServe()
    view.statusDisplay.textContent = state.playersName[servingPlayer] + servingPhrase
    view.statusDisplay.style.backgroundColor = playersColors[servingPlayer];

    var winner = checkWinner()
    if (winner != -1) {
        view.statusDisplay.textContent = state.playersName[winner] + winningPhrase;
        view.statusDisplay.style.backgroundColor = playersColors[winner]
    }

    if (state.isSoundEnabled) {
        announceState()
    }
}

view.startServingSelect.addEventListener('change', function () {
    startingPlayer = parseInt(this.value);
    reset();
});

controls.player1NameInput.addEventListener('change', updateNames);
controls.player2NameInput.addEventListener('change', updateNames);

controls.winningScoreSelect.addEventListener('change', function () {
    state.winningScore = parseInt(this.value);
    state.numberOfServes = numberOfServesMap[winningScore]
    reset();
});

controls.enabledSoundSelect.addEventListener('change', function () {
    isEnabled = !!parseInt(this.value);
    numberOfServes = numberOfServesMap[winningScore]
    reset();
});

controls.resetButton.addEventListener('click', reset);

function reset() {
    state.playersScore = [0, 0];

    render()
}

function announceState() {
    var winner = checkWinner()

    const soundPromises = [];
    if (winner == -1) {
        var serving = whoServe()
        var other = serving == 0 ? 1 : 0
    
        var announcerSource = announcers[serving]
        var firstScore = numberToDigitSounds(state.playersScore[serving])
        var secondScore = numberToDigitSounds(state.playersScore[other])
    
        firstScore.forEach(sound =>
            soundPromises.push(new Promise((resolve, reject) => {
                let audioData = base64ToArrayBuffer(announcerSource[sound])
                audioContext.decodeAudioData(audioData, buffer => {
                    resolve(buffer);
                }, error => {
                    reject(error);
                })
            }))
        )
        secondScore.forEach(sound =>
            soundPromises.push(new Promise((resolve, reject) => {
                let audioData = base64ToArrayBuffer(announcerSource[sound])
                audioContext.decodeAudioData(audioData, buffer => {
                    resolve(buffer);
                }, error => {
                    reject(error);
                })
            }))
        )

        key = playerColorName[serving] + servingPhrase
        soundPromises.push(new Promise((resolve, reject) => {
            let audioData = base64ToArrayBuffer(announcerSource[key])
            audioContext.decodeAudioData(audioData, buffer => {
                resolve(buffer);
            }, error => {
                reject(error);
            })
        }))
    } else {
        var announcerSource = announcers[winner]
        key = playerColorName[winner] + winningPhrase
        soundPromises.push(new Promise((resolve, reject) => {
            let audioData = base64ToArrayBuffer(announcerSource[key])
            audioContext.decodeAudioData(audioData, buffer => {
                resolve(buffer);
            }, error => {
                reject(error);
            })
        }))
    }

    Promise.all(soundPromises)
        .then(buffers => {
            playSoundsSequentially(buffers);
        })
        .catch(error => {
            console.error('Error decoding audio data:', error);
        });
}

function playSoundsSequentially(buffers) {
    buffer = buffers.reduce((combined, buffer) => {
        if (combined == null) return buffer

        var numberOfChannels = combined.numberOfChannels;
        var tmp = audioContext.createBuffer(numberOfChannels, (combined.length + buffer.length), combined.sampleRate);
        for (var i = 0; i < numberOfChannels; i++) {
            var channel = tmp.getChannelData(i);
            channel.set(combined.getChannelData(i), 0);
            channel.set(buffer.getChannelData(i), combined.length);
        }
        return tmp;
    })

    playSound(buffer)
}

function numberToDigitSounds(number) {
    number = number % 100

    if (number < 21) {
        return [number]
    }

    lowDigit = number % 10

    if (lowDigit == 0) {
        return [number]
    }

    highDigit = number - lowDigit
    return [highDigit, lowDigit]
}

function base64ToArrayBuffer(base64) {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function playSound(buffer) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}
