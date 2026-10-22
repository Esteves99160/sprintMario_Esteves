/**
 * Fenda do Biquini Jump - Lógica do Jogo e Integração com Ranking MySQL (Laragon)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do Jogo
    const bobEsponja = document.querySelector('.bob-esponja');
    const pipe = document.querySelector('.pipe');
    const espatula = document.getElementById('espatula');
    const gameBoard = document.getElementById('game-board');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const jumpTip = document.getElementById('jump-tip');

    // Modais e Telas
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

    // Variáveis de Estado
    let currentPlayer = '';
    let score = 0;
    let isPlaying = false;
    let gameLoop = null;
    let scoreLoop = null;
    let dificuldade = 1;
    let tempoJogo = 0;
    let dificuldadeLoop = null;
    let pipeFrame = null;
    let pipePosition = 0;
    let lastFrameTime = null;
    let velocidadeObstaculo = 600;
    let espatulaLoop = null;

    // Recupera último nome utilizado caso exista
    const savedName = localStorage.getItem('fenda_biquini_player');
    if (savedName && playerInput) {
        playerInput.value = savedName;
    }

    /**
     * Inicia uma nova rodada
     */
    
    function startGame() {
        clearInterval(gameLoop);
        clearInterval(scoreLoop);
        clearInterval(dificuldadeLoop);
        clearInterval(espatulaLoop);

        if (pipeFrame !== null) {
            cancelAnimationFrame(pipeFrame);
            pipeFrame = null;
        }

        tempoJogo = 0;
        dificuldade = 1;
        velocidadeObstaculo = 600;
        lastFrameTime = null;

        resetElements();

        isPlaying = true;
        score = 0;
        scoreDisplay.textContent = '0';
        hudPlayerName.textContent = currentPlayer || 'Jogador';

        pipe.style.right = 'auto';
        pipePosition = gameBoard.clientWidth;
        pipe.style.left = `${pipePosition}px`;

        gameBoard.classList.add('running');

        espatula.style.left = `${gameBoard.clientWidth}px`;
        espatulaLoop = setInterval(moverEspatula, 20);  

        // Inicia o movimento contínuo do obstáculo
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
                600 * dificuldade,
                1200
            );

            console.log(
                'Tempo:', tempoJogo,
                'segundos | Velocidade:', velocidadeObstaculo
            );
        }, 10000);

        scoreLoop = setInterval(() => {
            if (isPlaying) {
                score++;
                scoreDisplay.textContent = score;
            }
        }, 100);

        gameLoop = setInterval(checkCollision, 10);
    }


    function resetElements() {
        // Reseta cano
        pipe.style.animation = '';
        pipe.style.left = '';
        pipe.style.removeProperty('--pipe-duration');

        // Reseta Bob Esponja
        bobEsponja.src = 'assets/bobesponja.gif';
        bobEsponja.style.animation = '';
        bobEsponja.style.bottom = '0px';
        bobEsponja.style.width = '';
        bobEsponja.style.marginLeft = '';
        bobEsponja.classList.remove('jump');

        if (jumpTip) {
            jumpTip.style.opacity = '1';
        }
    }

    function moverObstaculo(timestamp) {
        if (!isPlaying) return;

        if (lastFrameTime === null) {
            lastFrameTime = timestamp;
        }

        const delta = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
        lastFrameTime = timestamp;

        pipePosition -= velocidadeObstaculo * delta;

        if (pipePosition < -pipe.offsetWidth) {
            pipePosition = gameBoard.clientWidth;
        }

        pipe.style.left = `${pipePosition}px`;

        pipeFrame = requestAnimationFrame(moverObstaculo);
    }

    function moverEspatula() {
        const espatula = document.getElementById('espatula');

        if (!espatula || !isPlaying) return;

        const posicaoAtual = parseFloat(espatula.style.left) || gameBoard.clientWidth;
        const novaPosicao = posicaoAtual - 6;

        if (novaPosicao < -espatula.offsetWidth) {
            espatula.style.left = `${gameBoard.clientWidth}px`;
        } else {
            espatula.style.left = `${novaPosicao}px`;
        }

        checkEspatulaCollision();
    }

    
    function checkEspatulaCollision() {
        const espatula = document.getElementById('espatula');

        if (!espatula || !isPlaying) return;

        const bobEsponjaRect = bobEsponja.getBoundingClientRect();
        const espatulaRect = espatula.getBoundingClientRect();

        const encostou =
            bobEsponjaRect.left < espatulaRect.right &&
            bobEsponjaRect.right > espatulaRect.left &&
            bobEsponjaRect.top < espatulaRect.bottom &&
            bobEsponjaRect.bottom > espatulaRect.top;

        if (encostou) {
            // Impede que a mesma espátula dê pontos várias vezes
            espatula.style.pointerEvents = 'none';

            score += 25;
            scoreDisplay.textContent = score;

            mostrarPontosExtras();
            mostrarBonusNoPlacar();

            // Faz a espátula reaparecer à direita
            espatula.style.left = `${gameBoard.clientWidth + 100}px`;

            // Libera a próxima coleta depois de reposicionar
            setTimeout(() => {
                espatula.style.pointerEvents = 'auto';
            }, 300);
        }
    }


    function mostrarPontosExtras() {
        const espatula = document.getElementById('espatula');
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

    function mostrarBonusNoPlacar() {
        const bonus = document.createElement('span');

        bonus.className = 'pontos-placar';
        bonus.textContent = '+25';

        scoreDisplay.parentElement.appendChild(bonus);

        setTimeout(() => {
            bonus.remove();
        }, 800);
    }

    function jump() {
        if (!isPlaying) return;
        if (bobEsponja.classList.contains('jump')) return;

        bobEsponja.classList.add('jump');

        if (jumpTip) {
            jumpTip.style.opacity = '0';
        }

        setTimeout(() => {
            bobEsponja.classList.remove('jump');
        }, 500);
    }

    function checkCollision() {
        if (!isPlaying) return;

        const bobEsponjaRect = bobEsponja.getBoundingClientRect();
        const pipeRect = pipe.getBoundingClientRect();

        // Verifica se o Bob encostou no balde
        const encostou =
            bobEsponjaRect.right > pipeRect.left + 10 &&
            bobEsponjaRect.left < pipeRect.right - 10 &&
            bobEsponjaRect.bottom > pipeRect.top + 10 &&
            bobEsponjaRect.top < pipeRect.bottom - 5;

        if (encostou) {
            const pipePosition = pipe.offsetLeft;
            const bobEsponjaPosition = parseFloat(
                window.getComputedStyle(bobEsponja).bottom
            );

            triggerGameOver(pipePosition, bobEsponjaPosition);
        }
    }

   
    function triggerGameOver(pipePosition, bobEsponjaPosition) {
        isPlaying = false;

        clearInterval(gameLoop);
        clearInterval(scoreLoop);
        clearInterval(dificuldadeLoop);
        clearInterval(espatulaLoop);

        // Para a movimentação do obstáculo
        if (pipeFrame !== null) {
            cancelAnimationFrame(pipeFrame);
            pipeFrame = null;
        }

        // Para a animação do cenário
        gameBoard.classList.remove('running');

        // Congela o obstáculo
        pipe.style.animation = 'none';
        pipe.style.left = `${pipePosition}px`;

        // Congela o Bob Esponja
        bobEsponja.style.animation = 'none';
        bobEsponja.style.bottom = `${bobEsponjaPosition}px`;
        bobEsponja.src = 'assets/bobesponja.gif';
        bobEsponja.style.width = '75px';
        bobEsponja.style.marginLeft = '50px';

        // Atualiza a pontuação final
        finalScoreValue.textContent = score;
        saveStatusMsg.textContent = 'Salvando pontuação no banco...';
        saveStatusMsg.style.color = '#ffcc00';

        // Abre a tela de Game Over
        gameoverModal.classList.add('active');

        // Salva a pontuação no banco MySQL
        saveScore(currentPlayer, score);
    }



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
                saveStatusMsg.textContent = 'Pontuação registrada no banco!';
                saveStatusMsg.style.color = '#10b981';
                if (data.ranking) {
                    renderRanking(data.ranking, playerName, finalScore);
                }
            } else {
                saveStatusMsg.textContent = '⚠️ ' + (data.message || 'Erro ao registrar.');
                saveStatusMsg.style.color = '#ef4444';
            }
        })
        .catch(err => {
            console.error('Erro na requisição:', err);
            saveStatusMsg.textContent = '⚠️ Erro ao conectar ao servidor Laragon.';
            saveStatusMsg.style.color = '#ef4444';
        });
    }

    /**
     * Busca o ranking atualizado no banco
     */
    function fetchRanking() {
        fetch('obter_ranking.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.ranking) {
                    renderRanking(data.ranking);
                }
            })
            .catch(err => console.error('Erro ao buscar ranking:', err));
    }

    /**
     * Atualiza a tabela HTML do ranking
     */
    function renderRanking(list, highlightName = null, highlightScore = null) {
        if (!rankingBody) return;
        rankingBody.innerHTML = '';

        if (!list || list.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Nenhuma pontuação gravada ainda. Jogue para ser o 1º!</td></tr>';
            return;
        }

        let highlighted = false;

        list.forEach((item, index) => {
            const tr = document.createElement('tr');

            // Destaca a pontuação atual recém-salva se coincidir
            if (!highlighted && highlightName && item.nome === highlightName && parseInt(item.pontos, 10) === highlightScore) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }

            let medal = `${index + 1}º`;
            if (index === 0) medal = '🥇 1º';
            else if (index === 1) medal = '🥈 2º';
            else if (index === 2) medal = '🥉 3º';

            tr.innerHTML = `
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
            `;

            rankingBody.appendChild(tr);
        });
    }

    /**
     * Função auxiliar para sanitizar strings no HTML
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

    // Submit do Formulário de Início (INICIAR JOGO)
    startForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede o recarregamento da página

        const nameValue = playerInput.value.trim();
        if (!nameValue) {
            playerInput.focus();
            return;
        }

        currentPlayer = nameValue;
        localStorage.setItem('fenda_biquini_player', currentPlayer);

        // Fecha tela de início e começa o jogo
        startModal.classList.remove('active');
        startGame();
    });

    // Botão "VER RANKING" na tela inicial
    btnViewRanking.addEventListener('click', () => {
        fetchRanking();
        finalScoreValue.textContent = '---';
        saveStatusMsg.textContent = '';
        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });

    // Botão "JOGAR NOVAMENTE" no Game Over
    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });

    // 4. Botão "TROCAR JOGADOR" no Game Over
    btnChangePlayer.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        resetElements();
        startModal.classList.add('active');
        playerInput.value = '';
        playerInput.focus();
    });

    // 5. Controle do Pulo por Teclado (Espaço ou Seta para Cima)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });
});