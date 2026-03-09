-- IMPORTANTE:
-- Caso as tabelas antigas (ex: workouts) já existam sem os relacionamentos e novos campos,
-- rode um ALTER TABLE ou DROP TABLE caso ainda não tenha dados importantes no seu app:
-- DROP TABLE IF EXISTS public.exercise_sets CASCADE;
-- DROP TABLE IF EXISTS public.workout_exercises CASCADE;
-- DROP TABLE IF EXISTS public.workouts CASCADE;

-- 1. TABELA DE TREINOS / SESSÕES
CREATE TABLE IF NOT EXISTS public.workouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT,
    data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duracao NUMERIC,
    duracao_real TEXT,
    volume_total NUMERIC,
    calorias_total NUMERIC,
    calorias_final NUMERIC,
    -- mantendo algumas colunas utilitárias das suas antigas reqs
    distancia_cardio NUMERIC DEFAULT 0,
    tempo_cardio NUMERIC DEFAULT 0,
    calorias_musculacao NUMERIC DEFAULT 0,
    calorias_cardio NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE EXERCÍCIOS DENTRO DO TREINO PAI
CREATE TABLE IF NOT EXISTS public.workout_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    exercise_api_id TEXT, -- (A api ExerciseDB usa ids ou strings; pode ser mapeado se necessário)
    exercise_name TEXT NOT NULL,
    sets INTEGER DEFAULT 0,
    reps INTEGER DEFAULT 0,
    weight NUMERIC DEFAULT 0,
    rest_seconds INTEGER DEFAULT 60,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE SÉRIES DE UM EXERCÍCIO (Detalhamento)
CREATE TABLE IF NOT EXISTS public.exercise_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE NOT NULL,
    set_number INTEGER NOT NULL,
    reps INTEGER DEFAULT 0,
    weight NUMERIC DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========== ROW LEVEL SECURITY (RLS) ================
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- Segurança Workouts (Quem está logado só vê/edita a si mesmo)
CREATE POLICY "Users can manage their own workouts"
ON public.workouts FOR ALL USING (auth.uid() = user_id);

-- Segurança Workout Exercises (Dependem do pai `workouts` para chegar no user_id)
CREATE POLICY "Users can manage their own workout_exercises"
ON public.workout_exercises FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.workouts w 
        WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid()
    )
);

-- Segurança Exercise Sets (Dependem do avô `workouts` para chegar no user_id)
CREATE POLICY "Users can manage their own exercise_sets"
ON public.exercise_sets FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.workout_exercises we
        JOIN public.workouts w ON w.id = we.workout_id
        WHERE we.id = exercise_sets.workout_exercise_id AND w.user_id = auth.uid()
    )
);
