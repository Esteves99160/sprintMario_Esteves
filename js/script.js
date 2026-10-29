/**
 * Fenda do Biquini Jump
 * Lógica do jogo, personagens, cenários e ranking MySQL (Laragon)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do jogo
    const bobEsponja = document.querySelector('.bob-esponja');
    const pipe = document.querySelector('.pipe');
    const espatula = document.getElementById('espatula');
    const gameBoard = document.getElementById('game-board');
    const scenarioTrack = document.querySelector('.scenario-track');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const vidasDisplay = document.getElementById('vidas-display');
    const jumpTip = document.getElementById('jump-tip');

    // Modais e telas
    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const btnViewRanking = document.getElementById('btn-view-ranking');

    const gameoverModal = document.getElementById('gameover-modal');
    const finalScoreValue = document.getElementById('final-score-value');
    const saveStatusMsg = document.getElementById('save-status-msg');
    const rankingBody = document.getElementById('ranking-body');
    const btnRestart = document.getElementById('btn-restart');
    const btnChangePlayer = document.getElementById('btn-change-player');

    // Tela de escolha de personagens
    const characterModal = document.getElementById('character-modal');
    const characterOptions = document.querySelectorAll('.character-option');
    const selectedCharacterText = document.getElementById('selected-character');
    const btnStartSelected = document.getElementById('btn-start-selected');
    const btnBackStart = document.getElementById('btn-back-start');

    // Personagem escolhido inicialmente
    let selectedCharacterName = 'Bob Esponja';
    let selectedCharacterImage = 'assets/bobesponja.gif';

    // Variáveis do jogo
    let currentPlayer = '';
    let score = 0;
    let vidas = 3;
    let isPlaying = false;

    let gameLoop = null;
    let scoreLoop = null;
    let dificuldadeLoop = null;
    let espatulaLoop = null;

    let dificuldade = 1;
    let tempoJogo = 0;
    let pipeFrame = null;
    let pipePosition = 0;
    let lastFrameTime = null;
    let velocidadeObstaculo = 600;
    let jumpAnim = null;

    const ALTURA_PULO = 225;
    const DURACAO_PULO_BASE = 650;
    const DURACAO_PULO_MIN = 650;
    const VELOCIDADE_INICIAL = 600;

    // Margens das áreas de colisão
    const HITBOX_BOB = { x: 0.25, y: 0.10 };
    const HITBOX_PEDRA = { x: 0.12, y: 0.08 };
    const HITBOX_ESPATULA = { x: 0.10, y: 0.10 };

    // Recupera o último nome utilizado
    const savedName = localStorage.getItem('fenda_biquini_player');

    if (savedName && playerInput) {
        playerInput.value = savedName;
    }

    /**
     * Calcula a área de colisão de um elemento.
     */
    function getHitbox(el, margem) {
        const r = el.getBoundingClientRect();

        return {
            left: r.left + r.width * margem.x,
            right: r.right - r.width * margem.x,
            top: r.top + r.height * margem.y,
            bottom: r.bottom - r.height * margem.y
        };
    }

    /**
     * Verifica se duas áreas se encostam.
     */
    function haColisao(a, b) {
        return a.right > b.left &&
               a.left < b.right &&
               a.bottom > b.top &&
               a.top < b.bottom;
    }

    /**
     * Inicia uma nova rodada.
     */
    function startGame() {
        clearInterval(gameLoop);
        clearInterval(scoreLoop);
        clearInterval(dificuldadeLoop);
        clearInterval(espatulaLoop);

        cancelJump();

        if (pipeFrame !== null) {
            cancelAnimationFrame(pipeFrame);
            pipeFrame = null;
        }

        tempoJogo = 0;
        dificuldade = 1;
        velocidadeObstaculo = VELOCIDADE_INICIAL;
        lastFrameTime = null;

        resetElements();

        isPlaying = true;
        score = 0;
        vidas = 3;

        atualizarVidas();

        scoreDisplay.textContent = '0';
        hudPlayerName.textContent = currentPlayer || 'Jogador';

        pipe.style.right = 'auto';
        pipePosition = gameBoard.clientWidth;
        pipe.style.left = `${pipePosition}px`;

        gameBoard.classList.add('running');

        espatula.style.left = `${gameBoard.clientWidth}px`;
        espatulaLoop = setInterval(moverEspatula, 20);

        // Inicia o movimento do obstáculo
        pipeFrame = requestAnimationFrame(moverObstaculo);

        
        // Aumenta a dificuldade a cada 10 segundos
        dificuldadeLoop = setInterval(() => {
            if (!isPlaying) return;

            tempoJogo += 10;

            dificuldade = Math.min(
                1 + (tempoJogo / 10) * 0.15,
                2
            );

            velocidadeObstaculo = Math.min(
                VELOCIDADE_INICIAL * dificuldade,
                1200
            );

            // Mostra o aviso quando a velocidade aumenta
            if (dificuldade < 2) {
                mostrarAvisoVelocidade();
            }

            console.log(
                'Tempo:', tempoJogo,
                'segundos | Velocidade:', velocidadeObstaculo
            );
        }, 10000);

        // Aumenta a pontuação com o tempo
        scoreLoop = setInterval(() => {
            if (isPlaying) {
                score++;
                scoreDisplay.textContent = score;
            }
        }, 100);

        // Verifica colisões com o obstáculo
        gameLoop = setInterval(checkCollision, 10);
    }

    /**
     * Prepara o cenário, o personagem e os objetos.
     */
    function resetElements() {
        const isSonic = selectedCharacterName === 'Sonic';

        // Escolhe o cenário e os objetos
        if (isSonic) {
            gameBoard.classList.add('sonic-mode');

            if (scenarioTrack) {
                scenarioTrack.querySelectorAll('img').forEach((imagem) => {
                    imagem.src = 'assets/green-hill.png';
                });
            }

            pipe.src = 'assets/espinho.png';
            pipe.alt = 'Espinho';
            pipe.style.bottom = '60px';

            espatula.src = 'assets/anel.png';
            espatula.alt = 'Anel dourado';
            espatula.style.bottom = '60px';

        } else {
            gameBoard.classList.remove('sonic-mode');

            if (scenarioTrack) {
                scenarioTrack.querySelectorAll('img').forEach((imagem) => {
                    imagem.src = 'assets/fenda-biquini.png';
                });
            }

            pipe.src = 'assets/pedra.png';
            pipe.alt = 'Pedra';
            pipe.style.bottom = '0px';

            espatula.src = 'assets/espatula.png';
            espatula.alt = 'Espátula';
            espatula.style.bottom = '100px';
        }

        // Define o tamanho do anel ou da espátula
        espatula.style.width = '50px';
        espatula.style.height = '50px';

        // Reseta a posição e a animação do obstáculo
        pipe.style.animation = '';
        pipe.style.left = '';
        pipe.style.removeProperty('--pipe-duration');

        // Define a imagem e a posição do personagem
        bobEsponja.src = selectedCharacterImage;
        bobEsponja.alt = selectedCharacterName;
        bobEsponja.style.animation = '';

        // Define a altura inicial do personagem
        if (isSonic) {
            bobEsponja.style.bottom = '60px';
        } else {
            bobEsponja.style.bottom = '0px';
        }

        bobEsponja.style.marginLeft = '';

        // Define o tamanho de cada personagem
        bobEsponja.style.width = isSonic ? '85px' : '95px';
        bobEsponja.style.height = isSonic ? '85px' : '95px';

        if (jumpTip) {
            jumpTip.style.opacity = '1';
        }
    }

    /* Sons do jogo */
    const somMoeda = new Audio('assets/sons/assets_sons_moeda.wav');
    const somMorrendo = new Audio('assets/sons/assets_sons_morrendo.wav');
    const somPulo = new Audio('assets/sons/assets_sons_pulando.wav');
    const somDano = new Audio('assets/sons/dano.wav');

    somMoeda.volume = 0.6;
    somMorrendo.volume = 0.7;
    somPulo.volume = 0.5;
    somDano.volume = 0.6;
       
    /* Toca o som desde o início */
    function tocarSom(som) {
        som.currentTime = 0;
        som.play().catch(erro => {
            console.warn('Não foi possível tocar o som:', erro);
        });
    }

    /**
     * Atualiza os corações de vida.
     */
    function atualizarVidas() {
        if (!vidasDisplay) return;

        const coracoesCheios = '❤️ '.repeat(vidas).trim();
        const coracoesVazios = '🖤 '.repeat(3 - vidas);

        vidasDisplay.textContent =
            `${coracoesCheios} ${coracoesVazios}`.trim();
    }

    /**
     * Remove uma vida quando há colisão.
     */
    function perderVida() {
        if (!isPlaying) return;

        vidas--;
        atualizarVidas();

        tocarSom(somDano);

        bobEsponja.classList.add('dano');

        setTimeout(() => {
            bobEsponja.classList.remove('dano');
        }, 800);

        if (vidas <= 0) {
            const posicaoObstaculo = pipe.offsetLeft;
            const posicaoBob = parseFloat(
                window.getComputedStyle(bobEsponja).bottom
            );

            triggerGameOver(posicaoObstaculo, posicaoBob);
            return;
        }

        // Reposiciona o obstáculo para evitar perder vidas seguidas
        pipePosition = gameBoard.clientWidth;
        pipe.style.left = `${pipePosition}px`;
    }

    let avisoVelocidadeTimeout;

    function mostrarAvisoVelocidade() {
        // Remove o aviso anterior, se ainda estiver na tela
        const avisoAntigo = gameBoard.querySelector('.aviso-velocidade');

        if (avisoAntigo) {
            avisoAntigo.remove();
        }

        clearTimeout(avisoVelocidadeTimeout);

        // Cria o novo aviso
        const aviso = document.createElement('div');
        aviso.className = 'aviso-velocidade';
        aviso.textContent = '⚡ AUMENTO DE VELOCIDADE! PREPARE-SE!';

        gameBoard.appendChild(aviso);

        // Remove a mensagem depois de 2,5 segundos
        avisoVelocidadeTimeout = setTimeout(() => {
            aviso.remove();
        }, 2500);
    }

    /**
     * Move o obstáculo pela tela.
     */
    function moverObstaculo(timestamp) {
        if (!isPlaying) return;

        if (lastFrameTime === null) {
            lastFrameTime = timestamp;
        }

        const delta = Math.min(
            (timestamp - lastFrameTime) / 1000,
            0.05
        );

        lastFrameTime = timestamp;
        pipePosition -= velocidadeObstaculo * delta;

        if (pipePosition < -pipe.offsetWidth) {
            pipePosition = gameBoard.clientWidth;
        }

        pipe.style.left = `${pipePosition}px`;

        pipeFrame = requestAnimationFrame(moverObstaculo);
    }

    /**
     * Move o anel ou a espátula pela tela.
     */
    function moverEspatula() {
        if (!espatula || !isPlaying) return;

        const posicaoAtual =
            parseFloat(espatula.style.left) || gameBoard.clientWidth;

        const novaPosicao = posicaoAtual - 6;

        if (novaPosicao < -espatula.offsetWidth) {
            espatula.style.left = `${gameBoard.clientWidth}px`;
        } else {
            espatula.style.left = `${novaPosicao}px`;
        }

        checkEspatulaCollision();
    }

    /**
     * Verifica a colisão com a pedra ou o espinho.
     */
    function checkCollision() {
        if (!isPlaying) return;

        const bobBox = getHitbox(bobEsponja, HITBOX_BOB);
        const obstaculoBox = getHitbox(pipe, HITBOX_PEDRA);

        if (haColisao(bobBox, obstaculoBox)) {
            perderVida();
        }
    }

    /**
     * Coletar anel ou espátula dá 25 pontos.
     */
    function checkEspatulaCollision() {
        if (!isPlaying) return;

        const bobBox = getHitbox(bobEsponja, HITBOX_BOB);
        const objetoBox = getHitbox(espatula, HITBOX_ESPATULA);

        if (haColisao(bobBox, objetoBox)) {

            tocarSom(somMoeda);

            score += 25;
            scoreDisplay.textContent = score;

            mostrarPontosExtras();
            mostrarBonusNoPlacar();

            // Faz o objeto reaparecer do lado direito
            espatula.style.left = `${gameBoard.clientWidth}px`;
        }
    }

    /**
     * Mostra +25 perto do objeto coletado.
     */
    function mostrarPontosExtras() {
        const pontos = document.createElement('div');

        pontos.className = 'pontos-flutuantes';
        pontos.textContent = '+25';

        pontos.style.left = `${espatula.offsetLeft}px`;
        pontos.style.top = `${espatula.offsetTop - 10}px`;

        gameBoard.appendChild(pontos);

        setTimeout(() => {
            pontos.remove();
        }, 800);
    }

    /**
     * Mostra +25 perto da pontuação.
     */
    function mostrarBonusNoPlacar() {
        const bonus = document.createElement('span');

        bonus.className = 'pontos-placar';
        bonus.textContent = '+25';

        scoreDisplay.parentElement.appendChild(bonus);

        setTimeout(() => {
            bonus.remove();
        }, 800);
    }

    /**
     * Cancela o pulo em andamento.
     */
    function cancelJump() {
        if (jumpAnim) {
            jumpAnim.onfinish = null;
            jumpAnim.cancel();
            jumpAnim = null;
        }
    }

    /**
     * Faz o personagem pular e retornar à altura inicial.
     */
    function jump() {
        if (!isPlaying) return;
        if (jumpAnim) return;

        tocarSom(somPulo);

        if (jumpTip) {
            jumpTip.style.opacity = '0';
        }

        const duracao = Math.max(
            DURACAO_PULO_MIN,
            DURACAO_PULO_BASE * VELOCIDADE_INICIAL / velocidadeObstaculo
        );

        // O Sonic começa e termina em 60px.
        // Os outros personagens começam e terminam em 0px.
        const alturaInicial =
            selectedCharacterName === 'Sonic' ? 60 : 0;

        jumpAnim = bobEsponja.animate([
            {
                bottom: `${alturaInicial}px`,
                offset: 0,
                easing: 'ease-out'
            },
            {
                bottom: `${alturaInicial + (selectedCharacterName === 'Sonic' ? 160 : ALTURA_PULO)}px`,
                offset: 0.35
            },
            {
                bottom: `${alturaInicial}px`,
                offset: 1,
                easing: 'ease-in'
            }
        ], {
            duration: duracao
        });

        jumpAnim.onfinish = () => {
            bobEsponja.style.bottom = `${alturaInicial}px`;
            jumpAnim = null;
        };
    }

    /**
     * Encerra a partida e mostra o Game Over.
     */
    function triggerGameOver(pipePosition, bobEsponjaPosition) {
        isPlaying = false;

        tocarSom(somMorrendo);

        clearInterval(gameLoop);
        clearInterval(scoreLoop);
        clearInterval(dificuldadeLoop);
        clearInterval(espatulaLoop);

        // Para o movimento do obstáculo
        if (pipeFrame !== null) {
            cancelAnimationFrame(pipeFrame);
            pipeFrame = null;
        }

        // Para a movimentação do cenário
        gameBoard.classList.remove('running');

        // Congela o obstáculo
        pipe.style.animation = 'none';
        pipe.style.left = `${pipePosition}px`;

        // Congela o personagem
        cancelJump();

        bobEsponja.style.animation = 'none';
        bobEsponja.style.bottom = `${bobEsponjaPosition}px`;
        bobEsponja.src = selectedCharacterImage;
        bobEsponja.alt = selectedCharacterName;

        // Mantém o tamanho correto no Game Over
        bobEsponja.style.width =
            selectedCharacterName === 'Sonic' ? '75px' : '80px';

        bobEsponja.style.height =
            selectedCharacterName === 'Sonic' ? '75px' : '80px';

        bobEsponja.style.marginLeft = '50px';

        // Atualiza a pontuação final
        finalScoreValue.textContent = score;
        saveStatusMsg.textContent = 'Salvando pontuação no banco...';
        saveStatusMsg.style.color = '#ffcc00';

        // Abre a tela de Game Over
        gameoverModal.classList.add('active');

        // Salva a pontuação no MySQL
        saveScore(currentPlayer, score);
    }


    /**
     * Salva a pontuação no banco de dados.
     */
    function saveScore(playerName, finalScore) {
        fetch('salvar_ranking.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: playerName,
                pontos: finalScore
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                saveStatusMsg.textContent =
                    'Pontuação registrada no banco!';

                saveStatusMsg.style.color = '#10b981';

                if (data.ranking) {
                    renderRanking(
                        data.ranking,
                        playerName,
                        finalScore
                    );
                }
            } else {
                saveStatusMsg.textContent =
                    '⚠️ ' + (data.message || 'Erro ao registrar.');

                saveStatusMsg.style.color = '#ef4444';
            }
        })
        .catch(err => {
            console.error('Erro na requisição:', err);

            saveStatusMsg.textContent =
                '⚠️ Erro ao conectar ao servidor Laragon.';

            saveStatusMsg.style.color = '#ef4444';
        });
    }

    /**
     * Busca o ranking atualizado no banco.
     */
    function fetchRanking() {
        fetch('obter_ranking.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.ranking) {
                    renderRanking(data.ranking);
                }
            })
            .catch(err => {
                console.error('Erro ao buscar ranking:', err);
            });
    }

    /**
     * Atualiza a tabela do ranking.
     */
    function renderRanking(
        list,
        highlightName = null,
        highlightScore = null
    ) {
        if (!rankingBody) return;

        rankingBody.innerHTML = '';

        if (!list || list.length === 0) {
            rankingBody.innerHTML =
                '<tr><td colspan="3" class="loading-cell">' +
                'Nenhuma pontuação gravada ainda. Jogue para ser o 1º!' +
                '</td></tr>';

            return;
        }

        let highlighted = false;

        list.forEach((item, index) => {
            const tr = document.createElement('tr');

            // Destaca a pontuação recém-salva
            if (
                !highlighted &&
                highlightName &&
                item.nome === highlightName &&
                parseInt(item.pontos, 10) === highlightScore
            ) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }

            let medal = `${index + 1}º`;

            if (index === 0) {
                medal = '🥇 1º';
            } else if (index === 1) {
                medal = '🥈 2º';
            } else if (index === 2) {
                medal = '🥉 3º';
            }

            tr.innerHTML = `
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
            `;

            rankingBody.appendChild(tr);
        });
    }

    /**
     * Protege os nomes exibidos no HTML.
     */
    function escapeHtml(str) {
        if (!str) return '';

        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Ao enviar o nome, abre a escolha de personagens.
     */
    startForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameValue = playerInput.value.trim();

        if (!nameValue) {
            playerInput.focus();
            return;
        }

        currentPlayer = nameValue;

        localStorage.setItem(
            'fenda_biquini_player',
            currentPlayer
        );

        startModal.classList.remove('active');
        characterModal.classList.add('active');
    });

    /**
     * Seleciona o personagem escolhido.
     */
    characterOptions.forEach((option) => {
        option.addEventListener('click', () => {
            characterOptions.forEach((personagem) => {
                personagem.classList.remove('selected');
            });

            option.classList.add('selected');

            selectedCharacterName = option.dataset.name;
            selectedCharacterImage = option.dataset.image;

            selectedCharacterText.textContent =
                'Você escolheu: ' + selectedCharacterName;

            btnStartSelected.disabled = false;
        });
    });

    /**
     * Começa o jogo com o personagem selecionado.
     */
    btnStartSelected.addEventListener('click', () => {
        characterModal.classList.remove('active');
        startGame();
    });

    /**
     * Volta para a tela inicial.
     */
    btnBackStart.addEventListener('click', () => {
        characterModal.classList.remove('active');
        startModal.classList.add('active');
    });

    /**
     * Abre o ranking.
     */
    btnViewRanking.addEventListener('click', () => {
        fetchRanking();

        finalScoreValue.textContent = '---';
        saveStatusMsg.textContent = '';

        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });

    /**
     * Reinicia a partida.
     */
    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');

        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });

    /**
     * Permite trocar de jogador.
     */
    btnChangePlayer.addEventListener('click', () => {
        gameoverModal.classList.remove('active');

        isPlaying = false;

        clearInterval(gameLoop);
        clearInterval(scoreLoop);
        clearInterval(dificuldadeLoop);
        clearInterval(espatulaLoop);

        if (pipeFrame !== null) {
            cancelAnimationFrame(pipeFrame);
            pipeFrame = null;
        }

        cancelJump();
        gameBoard.classList.remove('running');

        resetElements();

        startModal.classList.add('active');

        playerInput.value = '';
        playerInput.focus();
    });

    /**
     * Pulo pelo teclado: Espaço ou seta para cima.
     */
    document.addEventListener('keydown', (e) => {
        if (
            e.code === 'Space' ||
            e.key === ' ' ||
            e.code === 'ArrowUp'
        ) {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });

    /**
     * Pulo por clique ou toque na área do jogo.
     */
    gameBoard.addEventListener('pointerdown', (e) => {
        if (isPlaying) {
            e.preventDefault();
            jump();
        }
    });
});
