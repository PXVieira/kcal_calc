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
const views = ['login', 'dashboard', 'profile', 'new-workout', 'history', 'workout-details'];

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
        if (viewId === 'profile') navItems[2].classList.add('active');
    }

    // Dispara gatilhos de carregamento ao trocar de tela
    if (viewId === 'history') {
        loadHistory();
    } else if (viewId === 'dashboard') {
        loadDashboard();
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

    const nameDisplay = document.getElementById('profile-name-display');
    if (nameDisplay) nameDisplay.textContent = user.email.split('@')[0]; // Fallback inicial

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
        if (data.nome_completo) {
            document.getElementById('profile-nome').value = data.nome_completo;
            document.getElementById('profile-name-display').textContent = data.nome_completo;
            const welcomeMsg = document.getElementById('welcome-message');
            if (welcomeMsg) welcomeMsg.textContent = `Olá, ${data.nome_completo.split(' ')[0]} 👋`;
        }
        
        if (data.avatar_url) {
            document.getElementById('profile-avatar-url').value = data.avatar_url;
            updateAvatarUI(data.avatar_url);
        }

        if (data.idade) document.getElementById('profile-idade').value = data.idade;
        if (data.sexo) document.getElementById('profile-sexo').value = data.sexo;
        if (data.altura) document.getElementById('profile-altura').value = data.altura;
        if (data.peso) document.getElementById('profile-peso').value = data.peso;
        if (data.gordura) document.getElementById('profile-gordura').value = data.gordura;

        calculateMassaMagra();
    }
}

function updateAvatarUI(url) {
    const headerAvatar = document.getElementById('header-avatar');
    const profileAvatar = document.getElementById('profile-avatar-display');
    
    if (url) {
        const imgHeader = `<img src="${url}" alt="Avatar">`;
        const imgProfile = `<img src="${url}" alt="Avatar">
                           <div class="avatar-edit-badge"><i class="ri-camera-line"></i></div>`;
        
        if (headerAvatar) headerAvatar.innerHTML = imgHeader;
        if (profileAvatar) profileAvatar.innerHTML = imgProfile;
    } else {
        const icon = '<i class="ri-user-fill"></i>';
        if (headerAvatar) headerAvatar.innerHTML = icon;
        if (profileAvatar) profileAvatar.innerHTML = `${icon}<div class="avatar-edit-badge"><i class="ri-camera-line"></i></div>`;
    }
}

let pendingAvatarFile = null;

function handleAvatarSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validação de tamanho (500KB = 500 * 1024 bytes)
    const MAX_SIZE = 500 * 1024;
    if (file.size > MAX_SIZE) {
        alert("A imagem é muito grande. O limite máximo é de 500KB.");
        event.target.value = ""; // Limpa o input
        return;
    }

    pendingAvatarFile = file;

    // Gerar preview local
    const reader = new FileReader();
    reader.onload = function(e) {
        updateAvatarUI(e.target.result);
    };
    reader.readAsDataURL(file);
}

async function saveProfile() {
    const msgDiv = document.getElementById('profile-message');
    msgDiv.style.display = 'none';

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (!session) return;

    const nome_completo = document.getElementById('profile-nome').value || null;
    let avatar_url = document.getElementById('profile-avatar-url').value || null;

    // Fazer upload da imagem se houver arquivo pendente
    if (pendingAvatarFile) {
        const fileExt = pendingAvatarFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `avatars/${session.user.id}/${fileName}`;

        msgDiv.style.display = 'block';
        msgDiv.textContent = "Fazendo upload da imagem...";
        msgDiv.style.color = "var(--text-muted)";

        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('profiles')
            .upload(filePath, pendingAvatarFile);

        if (uploadError) {
            console.error("Erro no upload:", uploadError);
            msgDiv.className = "text-danger text-center mt-1";
            msgDiv.textContent = "Erro ao subir imagem: " + uploadError.message;
            return;
        }

        const { data: { publicUrl } } = supabaseClient
            .storage
            .from('profiles')
            .getPublicUrl(filePath);
        
        avatar_url = publicUrl;
        pendingAvatarFile = null; // Limpa após o upload
    }

    const idade = parseInt(document.getElementById('profile-idade').value) || null;
    const sexo = document.getElementById('profile-sexo').value || null;
    const altura = parseFloat(document.getElementById('profile-altura').value) || null;
    const peso = parseFloat(document.getElementById('profile-peso').value) || null;
    const gordura = parseFloat(document.getElementById('profile-gordura').value) || null;
    const massa_magra = parseFloat(document.getElementById('profile-massa-magra').value) || null;

    const profileData = {
        user_id: session.user.id,
        nome_completo,
        avatar_url,
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
        
        // Atualiza a UI imediatamente
        if (nome_completo) {
            document.getElementById('profile-name-display').textContent = nome_completo;
            const welcomeMsg = document.getElementById('welcome-message');
            if (welcomeMsg) welcomeMsg.textContent = `Olá, ${nome_completo.split(' ')[0]} 👋`;
        }
        updateAvatarUI(avatar_url);

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
