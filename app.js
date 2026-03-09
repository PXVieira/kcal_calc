// Configuração do Supabase
const SUPABASE_URL = 'https://kwhyqnsjzmjloejyjinl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jXgj4_O8P4Mk_nj8aTpJUw_lqkSPJbI';

let supabaseClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client Inicializado:", supabaseClient);
} else {
    console.warn("SDK do Supabase não foi carregado corretamente.");
}

// Navegação (SPA Router Simples)
const views = ['login', 'dashboard', 'profile', 'new-workout', 'history', 'workout-details', 'create-workout', 'exercise-search', 'progress', 'active-workout'];
const bottomNav = document.getElementById('bottom-nav');

function navigate(viewId, navElement = null) {
    // Oculta todas as telas
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Exibe a tela alvo
    const targetView = document.getElementById(`${viewId}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }

    // Configura visibilidade do Bottom Navigation
    if (viewId === 'login') {
        bottomNav.classList.add('hidden');
    } else {
        bottomNav.classList.remove('hidden');
    }

    // Atualiza estado ativo dos botões do Bottom Navigation
    if (navElement && !navElement.classList.contains('fab')) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        navElement.classList.add('active');
    } else {
        // Correção de highlight automático pelas funções externas
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        if (viewId === 'dashboard') navItems[0].classList.add('active');
        if (viewId === 'history') navItems[1].classList.add('active');
        if (viewId === 'progress') navItems[3].classList.add('active');
        if (viewId === 'profile') navItems[4].classList.add('active');
    }

    // Dispara gatilhos de carregamento ao trocar de tela
    if (viewId === 'history') {
        loadHistory();
    } else if (viewId === 'dashboard') {
        loadDashboard();
    } else if (viewId === 'progress') {
        loadProgressExercises();
    }
}

// Funções de Autenticação Supabase

function showError(msg) {
    const errDiv = document.getElementById('auth-error');
    if (errDiv) {
        errDiv.textContent = msg;
        errDiv.style.display = 'block';
        setTimeout(() => errDiv.style.display = 'none', 4000);
    } else {
        alert(msg);
    }
}

async function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return showError("Preencha email e senha.");

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        console.error("Erro no cadastro:", error);
        showError(error.message);
    } else {
        alert("Conta criada com sucesso! Você já pode entrar se o email for listado, ou verifique seu email.");
        if (data.session) {
            navigate('dashboard');
        }
    }
}

async function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return showError("Preencha email e senha.");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error("Erro no login:", error);
        showError("Credenciais inválidas ou erro no login.");
    } else {
        navigate('dashboard');
    }
}

async function signOut() {
    console.log("Fazendo logout...");
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error("Erro ignorado no logout", error);
    }
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    navigate('login');
}

// Verificação de Estado da Autenticação Inicial
async function checkAuthState() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (session) {
        navigate('dashboard');
        loadProfile(session.user);
    } else {
        navigate('login');
    }

    // Configurar listener para mudanças
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            navigate('dashboard');
            loadProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
            navigate('login');
        }
    });
}

// Lógica de Perfil

function calculateMassaMagra() {
    const peso = parseFloat(document.getElementById('profile-peso').value) || 0;
    const gordura = parseFloat(document.getElementById('profile-gordura').value) || 0;

    if (peso > 0) {
        // massa_magra = peso * (1 - gordura/100)
        const massaMagra = peso * (1 - (gordura / 100));
        document.getElementById('profile-massa-magra').value = massaMagra.toFixed(1);
    } else {
        document.getElementById('profile-massa-magra').value = "";
    }
}

async function loadProfile(user) {
    if (!user) return;

    // Atualiza email na tela
    const emailDisplay = document.getElementById('profile-email-display');
    if (emailDisplay) emailDisplay.textContent = user.email;

    // Buscar perfil do banco
    const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Erro ao carregar perfil:", error);
        return;
    }

    if (data) {
        if (data.idade) document.getElementById('profile-idade').value = data.idade;
        if (data.sexo) document.getElementById('profile-sexo').value = data.sexo;
        if (data.altura) document.getElementById('profile-altura').value = data.altura;
        if (data.peso) document.getElementById('profile-peso').value = data.peso;
        if (data.gordura) document.getElementById('profile-gordura').value = data.gordura;

        calculateMassaMagra();
    }
}

async function saveProfile() {
    const msgDiv = document.getElementById('profile-message');
    msgDiv.style.display = 'none';

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (!session) return;

    const idade = parseInt(document.getElementById('profile-idade').value) || null;
    const sexo = document.getElementById('profile-sexo').value || null;
    const altura = parseFloat(document.getElementById('profile-altura').value) || null;
    const peso = parseFloat(document.getElementById('profile-peso').value) || null;
    const gordura = parseFloat(document.getElementById('profile-gordura').value) || null;
    const massa_magra = parseFloat(document.getElementById('profile-massa-magra').value) || null;

    const profileData = {
        user_id: session.user.id,
        idade,
        sexo,
        altura,
        peso,
        gordura,
        massa_magra
    };

    // Upsert: atualiza se existir, insere se não existir
    const { error } = await supabaseClient
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

    msgDiv.style.display = 'block';
    if (error) {
        console.error("Erro ao salvar perfil:", error);
        msgDiv.className = "text-danger text-center mt-1";
        msgDiv.textContent = "Erro ao salvar perfil: " + error.message;
    } else {
        msgDiv.className = "text-center mt-1";
        msgDiv.style.color = "var(--primary-color)";
        msgDiv.textContent = "Perfil salvo com sucesso!";
        setTimeout(() => msgDiv.style.display = 'none', 3000);
    }
}

// Inicializações de Interface ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    // Registro do Service Worker para PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('Service Worker registrado com sucesso:', reg.scope))
                .catch(err => console.error('Falha ao registrar Service Worker:', err));
        });
    }

    // Checa estado da sessão primeiro
    checkAuthState();

    // 1. Botões de filtro (Histórico)
    const filterBtns = document.querySelectorAll('.month-filter .btn-chip');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Funções e listeners removidos para o botão manual de cálculo
});

// Lógica de Novo Treino
let currentWorkoutData = null;

// Cálculo de Calorias para o Novo Treino
function calculateKcalWorkout() {
    // 1. Coleta os valores dos inputs do form atual
    const duration = parseFloat(document.getElementById('workout-duration').value) || 0;
    const volume = parseFloat(document.getElementById('workout-volume').value) || 0;

    const cardioDist = parseFloat(document.getElementById('workout-cardio-dist').value) || 0;
    const cardioTime = parseFloat(document.getElementById('workout-cardio-time').value) || 0;

    // Pega o peso do perfil, usa 70kg como fallback se não houver um perfil preenchido ainda
    const pesoInput = document.getElementById('profile-peso').value;
    const peso = parseFloat(pesoInput) > 0 ? parseFloat(pesoInput) : 70;

    // Validação básica
    if (duration === 0 && volume === 0 && cardioDist === 0) {
        alert("Preencha ao menos um dado do seu treino para calcular.");
        return;
    }

    // 2. Cálculo Musculação
    // calorias_musculacao = MET * peso * (tempo / 60)
    const MET_MUSCULACAO = 5;
    let caloriasMusculacao = MET_MUSCULACAO * peso * (duration / 60);

    // Ajuste por volume de carga (volume < 3000 -> leve; 3000-6000 -> +5%; > 6000 -> +10%)
    if (volume > 6000) {
        caloriasMusculacao *= 1.10;
    } else if (volume >= 3000) {
        caloriasMusculacao *= 1.05;
    }

    // 3. Cálculo Cardio
    // calorias_cardio = peso * distancia * 1
    const caloriasCardio = peso * cardioDist * 1;

    // 4. Totais e Afterburn
    const total = caloriasMusculacao + caloriasCardio;
    const totalFinal = total * 1.08; // Total + 8% de Afterburn

    // Cópia para salvamento
    currentWorkoutData = {
        duracao: duration,
        volume_total: volume,
        distancia_cardio: cardioDist,
        tempo_cardio: cardioTime,
        calorias_musculacao: Math.round(caloriasMusculacao),
        calorias_cardio: Math.round(caloriasCardio),
        calorias_total: Math.round(total),
        calorias_final: Math.round(totalFinal),
        data: new Date().toISOString()
    };

    // 5. Atualizar na Interface do Card (Arredondado)
    document.getElementById('kcal-musculacao').textContent = Math.round(caloriasMusculacao);
    document.getElementById('kcal-cardio').textContent = Math.round(caloriasCardio);
    document.getElementById('kcal-total').textContent = Math.round(total);
    document.getElementById('workout-kcal-result').textContent = Math.round(totalFinal);

    const feedbackDiv = document.getElementById('workout-feedback');
    if (totalFinal > 1000) {
        feedbackDiv.textContent = "Excelente! Treino monstro! 🔥";
        feedbackDiv.style.color = "var(--primary-color)";
    } else if (totalFinal > 500) {
        feedbackDiv.textContent = "Belo treino! Muito bem! 💪";
        feedbackDiv.style.color = "var(--primary-color)";
    } else {
        feedbackDiv.textContent = "Treino concluído! Continue assim! 🏃‍♂️";
        feedbackDiv.style.color = "var(--text-muted)";
    }

    document.getElementById('workout-result-card').style.display = 'block';

    // Exibe o botão de salvar apenas se houve cálculo válido
    document.getElementById('btn-save-workout').style.display = 'block';
}

async function saveWorkout() {
    if (!currentWorkoutData) return;

    const msgDiv = document.getElementById('workout-message');
    msgDiv.style.display = 'none';

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (!session) {
        alert("Você precisa estar logado para salvar o treino.");
        return;
    }

    const workoutPayload = {
        ...currentWorkoutData,
        user_id: session.user.id
    };

    const { error } = await supabaseClient
        .from('workouts')
        .insert(workoutPayload);

    msgDiv.style.display = 'block';
    if (error) {
        console.error("Erro ao salvar treino:", error);
        msgDiv.className = "text-danger text-center mt-1";
        msgDiv.textContent = "Erro ao salvar treino. Tabela criada? " + error.message;
    } else {
        // Sucesso
        msgDiv.className = "text-center mt-1";
        msgDiv.style.color = "var(--primary-color)";
        msgDiv.textContent = "Treino salvo com sucesso! 🎉";

        // Timeout para ir ao dashboard
        setTimeout(() => {
            msgDiv.style.display = 'none';
            // Reseta form
            document.getElementById('workout-duration').value = "";
            document.getElementById('workout-volume').value = "";
            document.getElementById('workout-cardio-dist').value = "";
            document.getElementById('workout-cardio-time').value = "";
            document.getElementById('workout-result-card').style.display = 'none';
            document.getElementById('btn-save-workout').style.display = 'none';
            currentWorkoutData = null;

            navigate('dashboard');
        }, 2000);
    }
}

// ==== LÓGICA DE HISTÓRICO ====

// Variável para armazenar a lista global e o treino selecionado
let globalWorkouts = [];
let selectedWorkoutId = null;

async function loadHistory() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const listContainer = document.getElementById('history-workout-list');
    listContainer.innerHTML = '<div class="text-center text-muted" style="margin-top: 2rem;">Carregando...</div>';

    const { data, error } = await supabaseClient
        .from('workouts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('data', { ascending: false });

    if (error) {
        console.error("Erro ao carregar histórico:", error);
        listContainer.innerHTML = '<div class="text-danger text-center">Erro ao buscar treinos.</div>';
        return;
    }

    globalWorkouts = data || [];
    renderHistory(globalWorkouts);
}

function renderHistory(workouts) {
    const listContainer = document.getElementById('history-workout-list');
    listContainer.innerHTML = '';

    if (workouts.length === 0) {
        listContainer.innerHTML = '<div class="text-center text-muted" style="margin-top: 2rem;">Nenhum treino registrado ainda.</div>';
        return;
    }

    workouts.forEach(workout => {
        // Formata data (Ex: 05 Março, 06:30)
        const d = new Date(workout.data);
        const ptBRFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);

        // Define o ícone de acordo com o que teve no treino
        let iconHtml = '<i class="ri-drag-drop-line"></i>'; // Padrão
        let titulo = 'Treino Misto';
        if (workout.volume_total > 0 && workout.distancia_cardio == 0) {
            iconHtml = '<i class="ri-drag-drop-line"></i>';
            titulo = 'Musculação';
        } else if (workout.distancia_cardio > 0 && workout.volume_total == 0) {
            iconHtml = '<i class="ri-run-line"></i>';
            titulo = 'Cardio';
        }

        // Monta o Card HTML (agora clicável)
        const div = document.createElement('div');
        div.className = 'workout-item card';
        div.style.cursor = 'pointer';
        div.onclick = () => openWorkoutDetails(workout.id);

        div.innerHTML = `
            <div class="workout-icon">${iconHtml}</div>
            <div class="workout-details">
                <h5>${titulo}</h5>
                <p>${ptBRFormat} • ${workout.duracao} min</p>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Vol: ${workout.volume_total || 0}kg</p>
            </div>
            <div class="workout-kcal"><span>${workout.calorias_final} kcal</span></div>
        `;

        listContainer.appendChild(div);
    });
}

function openWorkoutDetails(id) {
    selectedWorkoutId = id;
    const workout = globalWorkouts.find(w => w.id === id);
    if (!workout) return;

    // Formatar titulo da data
    const d = new Date(workout.data);
    const dateStr = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);

    // Popula Modal/View
    document.getElementById('detail-date').textContent = dateStr;
    document.getElementById('detail-kcal-total').textContent = workout.calorias_final;

    document.getElementById('detail-duration').textContent = workout.duracao || 0;
    document.getElementById('detail-volume').textContent = workout.volume_total || 0;
    document.getElementById('detail-cardio-dist').textContent = workout.distancia_cardio || 0;
    document.getElementById('detail-cardio-time').textContent = workout.tempo_cardio || 0;

    document.getElementById('detail-kcal-musculacao').textContent = workout.calorias_musculacao || 0;
    document.getElementById('detail-kcal-cardio').textContent = workout.calorias_cardio || 0;

    navigate('workout-details');
}

async function deleteWorkout() {
    if (!selectedWorkoutId) return;

    if (!confirm('Deseja realmente excluir este treino? O resultado total no Dashboard também decrescerá.')) {
        return;
    }

    const { error } = await supabaseClient
        .from('workouts')
        .delete()
        .eq('id', selectedWorkoutId);

    if (error) {
        alert("Erro ao excluir treino: " + error.message);
    } else {
        alert("Treino excluído com sucesso.");
        navigate('history'); // Volta e recarrega
    }
}

// ==== LÓGICA DE DASHBOARD ====

async function loadDashboard() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    // Preparar as datas da "Semana Atual" (Domingo a Sábado)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0(Dom) a 6(Sab)

    // Data inicial (Domingo da semana atual, às 00:00:00 local)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    // Data final (Hoje, ou final de sábado)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Busca treinos do usuário limitados pelos dias da semana preenchidos
    const { data, error } = await supabaseClient
        .from('workouts')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('data', startOfWeek.toISOString())
        .lte('data', endOfWeek.toISOString())
        .order('data', { ascending: false });

    if (error) {
        console.error("Erro ao carregar Dashboard:", error);
        return;
    }

    const workoutsThisWeek = data || [];

    // Cálculos Gerais (Semana)
    let totalKcalWeek = 0;
    workoutsThisWeek.forEach(w => totalKcalWeek += (w.calorias_final || 0));

    document.getElementById('dash-kcal-week').textContent = Math.round(totalKcalWeek);
    document.getElementById('dash-workouts-week').textContent = workoutsThisWeek.length;

    // Últimos Treinos (Mostra até os 3 mais recentes, não restrito a esta semana)
    renderDashboardRecentWorkouts(session.user.id);
}

async function renderDashboardRecentWorkouts(userId) {
    const listContainer = document.getElementById('dash-recent-workouts');
    listContainer.innerHTML = '<div class="text-center text-muted" style="margin-top: 1rem; font-size: 0.9rem;">Carregando...</div>';

    // Busca só os 3 últimos independentemente da semana
    const { data, error } = await supabaseClient
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .order('data', { ascending: false })
        .limit(3);

    if (error || !data || data.length === 0) {
        listContainer.innerHTML = '<div class="text-center text-muted" style="margin-top: 1rem; font-size: 0.9rem;">Nenhum treino registrado.</div>';
        return;
    }

    listContainer.innerHTML = '';

    // Mesma lógica de Cards do Histórico
    data.forEach(workout => {
        const d = new Date(workout.data);
        const ptBRFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);

        let iconHtml = '<i class="ri-drag-drop-line"></i>';
        let titulo = 'Treino Misto';
        if (workout.volume_total > 0 && workout.distancia_cardio == 0) {
            iconHtml = '<i class="ri-drag-drop-line"></i>';
            titulo = 'Musculação';
        } else if (workout.distancia_cardio > 0 && workout.volume_total == 0) {
            iconHtml = '<i class="ri-run-line"></i>';
            titulo = 'Cardio';
        }

        const div = document.createElement('div');
        div.className = 'workout-item card';

        div.innerHTML = `
            <div class="workout-icon">${iconHtml}</div>
            <div class="workout-details">
                <h5>${titulo}</h5>
                <p>Dia ${ptBRFormat}</p>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                    <i class="ri-timer-line"></i> ${workout.duracao_real ? workout.duracao_real : workout.duracao + ' min'} • 
                    <i class="ri-weight-line"></i> ${workout.volume_total} kg
                </p>
            </div>
            <div class="workout-kcal"><span>${workout.calorias_final} kcal</span></div>
        `;

        listContainer.appendChild(div);
    });
}

// ==== LÓGICA DA EXERCISEDB API ====
const EXERCISEDB_API_KEY = 'b1a9301325msh6394f09af46857ap1527acjsn817f04a886e5';
const EXERCISEDB_HOST = 'exercisedb.p.rapidapi.com';

async function handleExerciseSearch() {
    const query = document.getElementById('exercise-search-input').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('exercise-results');

    if (!query) {
        resultsContainer.innerHTML = '<div class="text-center text-muted" style="margin-top: 2rem;"><i class="ri-error-warning-line" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>Por favor, digite um termo.</div>';
        return;
    }

    resultsContainer.innerHTML = '<div class="text-center text-muted" style="margin-top: 2rem;"><i class="ri-loader-4-line ri-spin" style="font-size: 2.5rem; color: var(--primary-color); display: inline-block;"></i><br><br>Buscando exercícios...</div>';

    try {
        const url = `https://exercisedb.p.rapidapi.com/exercises/name/${query}?limit=10`;
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': EXERCISEDB_API_KEY,
                'X-RapidAPI-Host': EXERCISEDB_HOST
            }
        };

        const response = await fetch(url, options);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("API Key inválida ou não configurada.");
            }
            throw new Error(`Erro na API: Código ${response.status}`);
        }

        const data = await response.json();
        renderExerciseResults(data);

    } catch (error) {
        console.error("Erro na busca de exercícios:", error);
        resultsContainer.innerHTML = `
            <div class="text-center text-danger" style="margin-top: 2rem; background: rgba(239, 68, 68, 0.1); padding: 1.5rem; border-radius: var(--card-radius);">
                <i class="ri-alert-line" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                <strong>Falha na Busca</strong><br>
                <small style="opacity: 0.8;">${error.message}</small><br><br>
                <small style="color: var(--text-muted);">Verifique se a variável EXERCISEDB_API_KEY foi preenchida no app.js</small>
            </div>`;
    }
}

function renderExerciseResults(exercises) {
    const resultsContainer = document.getElementById('exercise-results');
    resultsContainer.innerHTML = '';

    if (!exercises || exercises.length === 0) {
        resultsContainer.innerHTML = '<div class="text-center text-muted" style="margin-top: 2rem;">Nenhum exercício encontrado com esse termo.</div>';
        return;
    }

    exercises.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'exercise-card';

        // Sanitize name parameter for onclick
        const safeName = ex.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        card.innerHTML = `
            <img src="${ex.gifUrl}" alt="${ex.name}" class="exercise-gif" loading="lazy" onerror="this.src='https://placehold.co/400x200/1E293B/94A3B8?text=Imagem+Indisponível'">
            <div class="exercise-info">
                <h4 class="exercise-title">${ex.name}</h4>
                <div class="exercise-badges">
                    <span class="badge"><i class="ri-focus-3-line"></i> ${ex.target}</span>
                    <span class="badge equip"><i class="ri-tools-line"></i> ${ex.equipment}</span>
                </div>
                <button class="btn btn-primary btn-small w-100" onclick="addExerciseToWorkout('${safeName}')">Adicionar ao Treino</button>
            </div>
        `;

        resultsContainer.appendChild(card);
    });
}

async function addExerciseToWorkout(exerciseName, gifUrl) {
    // Buscar Sugestão de Carga Inteligente (Progressão)
    const suggestionInfo = await calculateExerciseSuggestion(exerciseName);

    // Adiciona o exercício na lista global de criação
    currentRoutineExercises.push({
        id: Date.now().toString(), // id temporário único
        name: exerciseName,
        gifUrl: gifUrl,
        sets: 3,
        reps: 10,
        weight: suggestionInfo.suggestedWeight,
        rest: 60,
        suggestionText: suggestionInfo.message
    });

    // Mostra contador na tela de busca
    const badgeBtn = document.getElementById('btn-finish-search');
    const badgeCount = document.getElementById('search-badge-count');
    if (badgeBtn) badgeBtn.style.display = 'inline-flex';
    if (badgeCount) badgeCount.textContent = currentRoutineExercises.length;

    // Feedback visual rápido
    alert(`"${exerciseName}" adicionado à lista!\n(Já temos ${currentRoutineExercises.length} exercícios).`);

    // Re-renderiza a lista da tela de rotina de treinos invisívelmente
    renderRoutineList();
}

// ==== LÓGICA DE CRIAÇÃO DE TREINO COM EXERCÍCIOS ====
let currentRoutineExercises = [];

function renderRoutineList() {
    const listContainer = document.getElementById('routine-exercise-list');
    const emptyState = document.getElementById('routine-empty-state');
    const saveBtn = document.getElementById('btn-save-routine');

    // Limpa estado vazio inicial
    listContainer.innerHTML = '';

    if (currentRoutineExercises.length === 0) {
        if (emptyState) listContainer.appendChild(emptyState);
        if (saveBtn) saveBtn.style.display = 'none';

        // Reset search badge se existir
        const badgeBtn = document.getElementById('btn-finish-search');
        if (badgeBtn) badgeBtn.style.display = 'none';
        return;
    }

    if (saveBtn) saveBtn.style.display = 'block';

    // Itera e cria cards customizáveis
    currentRoutineExercises.forEach((ex, index) => {
        const card = document.createElement('div');
        card.className = 'card form-card';
        card.style.padding = '1rem';
        card.style.position = 'relative';

        card.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--surface-light);">
                <img src="${ex.gifUrl}" style="width: 70px; height: 70px; border-radius: 8px; object-fit: cover; background: #fff;">
                <div style="flex: 1;">
                    <h5 style="text-transform: capitalize; margin-bottom: 0.3rem; font-size: 1.05rem;">${ex.name}</h5>
                    <button class="btn btn-small btn-outline text-danger" style="border: none; padding: 0; height: auto;" onclick="removeRoutineExercise('${ex.id}')">
                        <i class="ri-delete-bin-line"></i> Remover
                    </button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 0.2rem;">Séries</label>
                    <input type="number" min="1" value="${ex.sets}" onchange="updateRoutineEx('${ex.id}', 'sets', this.value)" style="padding: 0.5rem;" class="form-control">
                </div>
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 0.2rem;">Repetições</label>
                    <input type="number" min="1" value="${ex.reps}" onchange="updateRoutineEx('${ex.id}', 'reps', this.value)" style="padding: 0.5rem;" class="form-control">
                </div>
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 0.2rem;">Peso (kg)</label>
                    <input type="number" min="0" value="${ex.weight}" onchange="updateRoutineEx('${ex.id}', 'weight', this.value)" style="padding: 0.5rem;" class="form-control">
                    <small style="display:block; color:var(--primary-color); font-size: 0.70rem; margin-top: 0.2rem; line-height: 1.1;">${ex.suggestionText}</small>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 0.2rem;">Descanso (seg) 
                        <span style="color:var(--primary-color); cursor:pointer; font-size:0.75rem; font-weight:bold;" onclick="startRestTimer(${ex.rest})"><i class="ri-play-circle-line"></i> Testar Timer</span>
                    </label>
                    <input type="number" min="0" value="${ex.rest}" onchange="updateRoutineEx('${ex.id}', 'rest', this.value)" style="padding: 0.5rem;" class="form-control">
                </div>
            </div>
        `;

        listContainer.appendChild(card);
    });
}

function updateRoutineEx(id, field, value) {
    const exIndex = currentRoutineExercises.findIndex(e => e.id === id);
    if (exIndex > -1) {
        currentRoutineExercises[exIndex][field] = parseInt(value, 10) || 0;
    }
}

function removeRoutineExercise(id) {
    currentRoutineExercises = currentRoutineExercises.filter(e => e.id !== id);
    renderRoutineList();

    // Oculta badge na busca se esvaziar
    const badgeBtn = document.getElementById('btn-finish-search');
    if (badgeBtn) {
        if (currentRoutineExercises.length === 0) {
            badgeBtn.style.display = 'none';
        } else {
            document.getElementById('search-badge-count').textContent = currentRoutineExercises.length;
        }
    }
}

async function saveRoutine() {
    const name = document.getElementById('routine-name').value.trim();
    if (!name) {
        alert("Por favor, digite um nome para a rotina de treino.");
        return;
    }

    if (currentRoutineExercises.length === 0) {
        alert("Sua rotina precisa ter ao menos um exercício.");
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        alert("Você precisa estar logado.");
        return;
    }

    const saveBtn = document.getElementById('btn-save-routine');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando no Banco...';

    try {
        // 1. Inserir na tabela Pai (workouts)
        const { data: workoutData, error: workoutError } = await supabaseClient
            .from('workouts')
            .insert({
                user_id: session.user.id,
                name: name,
                calorias_final: 0 // Rotina não gera calorias ao ser CRIADA, só ao ser EXECUTADA
            })
            .select()
            .single();

        if (workoutError) throw workoutError;
        const newWorkoutId = workoutData.id;

        // 2. Prepara os exercícios para a tabela Filha (workout_exercises)
        for (let i = 0; i < currentRoutineExercises.length; i++) {
            const exInfo = currentRoutineExercises[i];

            const { data: exerciseData, error: exerciseError } = await supabaseClient
                .from('workout_exercises')
                .insert({
                    workout_id: newWorkoutId,
                    exercise_name: exInfo.name,
                    sets: exInfo.sets,
                    reps: exInfo.reps,
                    weight: exInfo.weight,
                    rest_seconds: exInfo.rest,
                    order_index: i
                })
                .select()
                .single();

            if (exerciseError) throw exerciseError;
            const newExerciseId = exerciseData.id;

            // 3. Opcional agora mas já vital pra arquitetura (Tabela Neta = exercise_sets)
            // Gera as linhas baseadas no numero de 'sets' escolhido pelo usuario.
            let setsToInsert = [];
            for (let s = 1; s <= exInfo.sets; s++) {
                setsToInsert.push({
                    workout_exercise_id: newExerciseId,
                    set_number: s,
                    reps: exInfo.reps,
                    weight: exInfo.weight,
                    completed: false
                });
            }

            // Inserção em massa array de sets
            if (setsToInsert.length > 0) {
                const { error: setsError } = await supabaseClient
                    .from('exercise_sets')
                    .insert(setsToInsert);

                if (setsError) throw setsError;
            }
        }

        // Sucesso
        alert(`A ficha de treino "${name}" foi criada e registrada com sucesso no seu Histórico!`);

        // Limpar fila e retornar
        currentRoutineExercises = [];
        document.getElementById('routine-name').value = '';
        renderRoutineList();

        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Ficha de Treino';

        navigate('dashboard');

    } catch (error) {
        console.error("Erro ao salvar rotina: ", error);
        alert("Erro no banco de dados ao salvar a ficha: " + error.message);

        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Ficha de Treino';
    }
}

// ==== TIMER DE DESCANSO AUTOMÁTICO ====
let restInterval = null;

function startRestTimer(secondsToRest) {
    if (!secondsToRest || secondsToRest <= 0) return;

    // Mostra o Modal
    const timerModal = document.getElementById('rest-timer-modal');
    const displayTime = document.getElementById('timer-display-time');
    const statusText = document.getElementById('timer-status-text');
    const timerIcon = timerModal.querySelector('.timer-icon');

    timerModal.style.display = 'flex';
    timerModal.classList.remove('finished');
    statusText.textContent = 'Descanso';
    timerIcon.className = 'ri-timer-flash-line timer-icon';
    displayTime.textContent = secondsToRest;

    let currentSeconds = secondsToRest;

    // Limpa se houver um rodando (embora o modal bloqueie cliques de sobra)
    if (restInterval) clearInterval(restInterval);

    restInterval = setInterval(() => {
        currentSeconds--;

        if (currentSeconds > 0) {
            displayTime.textContent = currentSeconds;
        } else {
            // Acabou o tempo
            clearInterval(restInterval);
            displayTime.textContent = '0';
            statusText.textContent = 'Pronto para próxima série!';
            timerModal.classList.add('finished');
            timerIcon.className = 'ri-check-double-line timer-icon';

            // Auto fecha depois de mostrar que concluiu por 3 segs
            setTimeout(() => {
                skipRestTimer();
            }, 3000);

            // Tenta vibrar se for num mobile compativel
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
        }
    }, 1000);
}

function skipRestTimer() {
    const timerModal = document.getElementById('rest-timer-modal');
    timerModal.style.display = 'none';

    if (restInterval) {
        clearInterval(restInterval);
        restInterval = null;
    }
}

// ==== TELA DE PROGRESSO (GRÁFICOS CHART.JS) ====
let progressChartInstance = null;

async function loadProgressExercises() {
    const selectEl = document.getElementById('progress-exercise-select');
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="">Carregando exercícios...</option>';

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    try {
        // Tenta buscar da tabela "workout_exercises" real atrelada ao UID se existir e estiver preenchida.
        // Como o usuário pode não ter logado nada no database ainda, usamos um fetch mock se vier 0.

        const { data: exercisesData, error } = await supabaseClient
            .from('workout_exercises')
            .select('exercise_name, workouts!inner(user_id)')
            .eq('workouts.user_id', session.user.id);

        let uniqueExercises = [];

        if (exercisesData && exercisesData.length > 0) {
            // Extrai nomes unicos do banco
            const names = exercisesData.map(e => e.exercise_name);
            uniqueExercises = [...new Set(names)];
        } else {
            // Simulando um retorno caso o usuário não tenha treinos preenchidos (pra visualizar a UI)
            uniqueExercises = ['Supino Reto', 'Agachamento Livre', 'Remada Curvada'];
        }

        // Popula o select box
        selectEl.innerHTML = '<option value="" disabled selected>Selecione um exercício...</option>';
        uniqueExercises.forEach(exName => {
            const opt = document.createElement('option');
            opt.value = exName;
            opt.textContent = exName;
            selectEl.appendChild(opt);
        });

    } catch (e) {
        console.error("Erro renderizando exercícios progressos", e);
        selectEl.innerHTML = '<option value="">Erro ao carregar.</option>';
    }
}

async function renderProgressChart() {
    const selectEl = document.getElementById('progress-exercise-select');
    const selectedExercise = selectEl.value;
    const emptyState = document.getElementById('progress-empty-state');
    const canvasContainer = document.getElementById('progressChart').parentNode;

    if (!selectedExercise) return;

    // Em um cénario real puxariamos da base: datas e pesos_medios em ordem cronológica
    // Devido ao mock exigido pela ausência temporária do recurso rodando real "live",
    // Criaremos os pontos aleatórios ascendentes para exibição visual do ChartJS.

    const mockDates = [];
    const mockWeights = [];
    let baseWeight = Math.floor(Math.random() * 40) + 15; // 15kg ~ 55kg

    // Gerando historico dos ultimos 6 treinos
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - (i * 7)); // um treino por semana pra tras
        mockDates.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));

        // Peso medio subindo aos poucos
        mockWeights.push(baseWeight);
        baseWeight += Math.floor(Math.random() * 3) + 1; // sobe 1~3kg a cada treino
    }

    canvasContainer.style.display = 'block';
    emptyState.style.display = 'none';

    plotChartJS(mockDates, mockWeights, selectedExercise);
}

function plotChartJS(labels, dataPoints, exerciseName) {
    const ctx = document.getElementById('progressChart').getContext('2d');

    // Destroi gráfico anterior pra ele não transpor na transição
    if (progressChartInstance) {
        progressChartInstance.destroy();
    }

    const isDarkTheme = document.body.getAttribute('data-theme') === 'light' ? false : true;
    const textColor = isDarkTheme ? '#e2e8f0' : '#1e293b';
    const gridColor = isDarkTheme ? '#334155' : '#e2e8f0';

    progressChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Peso Médio (kg)',
                data: dataPoints,
                borderColor: '#10b981', // Sucesso Green
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#0f172a',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.3 // curva mais suave
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Nao precisa legenda ja q temos o titulo no tooltip e 1 linha so
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#10b981',
                    bodyColor: '#fff',
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y + ' kg';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        padding: 10
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor
                    }
                }
            }
        }
    });
}

// ==== CRONÔMETRO GLOBAL DO TREINO ====
let globalWorkoutInterval = null;
let globalWorkoutSeconds = 0;
let currentActiveWorkoutId = null;

function formatHHMMSS(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function startWorkoutGlobalTimer(workoutId) {
    currentActiveWorkoutId = workoutId || null;
    globalWorkoutSeconds = 0;

    const globalBar = document.getElementById('global-workout-timer');
    const timerText = document.getElementById('global-timer-text');

    // Revela e Inicia
    globalBar.classList.add('active');
    timerText.textContent = "00:00:00";

    if (globalWorkoutInterval) clearInterval(globalWorkoutInterval);

    globalWorkoutInterval = setInterval(() => {
        globalWorkoutSeconds++;
        timerText.textContent = formatHHMMSS(globalWorkoutSeconds);
    }, 1000);

    // Ancorar direto na aba simulada pro usuário ver
    navigate('active-workout');
}

async function finishWorkout() {
    if (globalWorkoutInterval) clearInterval(globalWorkoutInterval);

    const finalTimeString = formatHHMMSS(globalWorkoutSeconds);
    const globalBar = document.getElementById('global-workout-timer');
    globalBar.classList.remove('active');

    // MOCK VIRTUAL MÍNIMO PRA ELE PODER TESTAR A UI APENAS:
    // Em um cenário real de backend estendido aqui pegaríamos 'currentActiveWorkoutId' e 
    // faríamos um UPDATE supabaseClient.from('workouts').update({duracao_real: finalTimeString})

    alert(`👏 Treino Finalizado!\nDuração Oficial gravada: ${finalTimeString}`);

    // Limpando o rastro
    globalWorkoutSeconds = 0;
    currentActiveWorkoutId = null;
    navigate('dashboard');
}

// ==== MODO OFFLINE / SINCRONIZAÇÃO ====
function saveWorkoutLocally(workoutData) {
    const pending = JSON.parse(localStorage.getItem('pendingWorkouts') || '[]');
    pending.push({
        ...workoutData,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('pendingWorkouts', JSON.stringify(pending));
    console.log("Treino salvo localmente (Offline)", workoutData);
}

async function syncOfflineWorkouts() {
    const pending = JSON.parse(localStorage.getItem('pendingWorkouts') || '[]');
    if (pending.length === 0) return;

    console.log(`Sincronizando ${pending.length} treinos pendentes...`);

    for (let i = 0; i < pending.length; i++) {
        const workout = pending[i];
        try {
            // Aqui chamariamos a lógica real de salvamento no Supabase
            // Mas como estamos simulando a execução, vamos apenas logar o sucesso
            console.log("Sincronizando treino:", workout);

            // Simulação de delay de rede
            await new Promise(resolve => setTimeout(resolve, 500));

            // Se o salvamento real tivesse sucesso, removeríamos do array
            // (Para este MVP, vamos apenas limpar o array ao final se houver rede)
        } catch (error) {
            console.error("Erro ao sincronizar treino offline:", error);
            return; // Para se der erro
        }
    }

    localStorage.removeItem('pendingWorkouts');
    alert("🚀 Seus treinos offline foram sincronizados com sucesso!");
}

async function calculateExerciseSuggestion(exerciseName) {
    // Como ainda não temos a tabela real de 'Treinos Realizados (Logs)' no Supabase
    // onde armazenaremos os resultados das séries e reps (ex: "completou 3x12 com 20kg"),
    // criamos este simulador que dita a regra provisoriamente.
    // O próximo passo do backend consistirá em consultar a Database verdadeira e substituir isto.

    // Sorteia um peso fictício que o usuário usou da última vez (entre 10kg e 60kg)
    const lastWeight = Math.floor(Math.random() * 50) + 10;

    // Simula se o usuário concluiu as séries passadas todas perfeitamente ou se falhou em alguma
    const completedAllRepsPerfectly = Math.random() > 0.4;

    let suggestedWeight = lastWeight;
    let message = "";

    if (completedAllRepsPerfectly) {
        // Regra do Usuário: Completar perfeitamente = aumentar 5%
        suggestedWeight = lastWeight * 1.05;
        suggestedWeight = Math.ceil(suggestedWeight); // Arredonda para não ter quebrados distantes
        message = `Último Treino: ${lastWeight}kg (Sucesso). Sugestão para próximo treino: ${suggestedWeight} kg`;
    } else {
        // Regra do Usuário: Falhou em repetições = Manter peso.
        message = `Último Treino: ${lastWeight}kg (Falhou). Sugestão para próximo treino: ${suggestedWeight} kg`;
    }

    return {
        suggestedWeight: suggestedWeight,
        message: message
    };
}
// ==== PWA: INSTALAÇÃO ====
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Impede que o prompt padrão apareça
    e.preventDefault();
    // Guarda o evento para disparar depois
    deferredPrompt = e;
    // Mostra o botão de instalação na tela de perfil
    const installItem = document.getElementById('install-pwa-item');
    if (installItem) {
        installItem.style.display = 'flex';
    }
});

async function installPWA() {
    if (!deferredPrompt) return;

    // Mostra o prompt de instalação
    deferredPrompt.prompt();

    // Espera pela escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Escolha do usuário na instalação: ${outcome}`);

    if (outcome === 'accepted') {
        const installItem = document.getElementById('install-pwa-item');
        if (installItem) installItem.style.display = 'none';
    }

    // Limpa o prompt para não ser usado novamente
    deferredPrompt = null;
}
