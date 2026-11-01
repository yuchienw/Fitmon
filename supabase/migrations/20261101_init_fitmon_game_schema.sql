-- ==============================================================================
-- FitMon 遊戲驅動資料庫綱要 (Supabase Migration: Game-Driven Schema v1.1)
-- 依據 GDD v1.1 規範：雙軌紙娃娃 (角色+房間)、任務經濟、拍立得社群與原子打賞
-- ==============================================================================

-- 啟用必要的擴充套件
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. 玩家主檔與遊戲狀態 (profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    bio TEXT DEFAULT '保持自律，像素無敵！',
    
    -- 角色 5 層紙娃娃配置 (JSONB)
    -- 範例: {"body": "fair", "face": "wink", "hair": "ponytail_black", "outfit": "tank_red", "prop": "water_bottle"}
    avatar_config JSONB NOT NULL DEFAULT '{
        "body": "fair",
        "face": "smile",
        "hair": "short_black",
        "outfit": "starter_tank_blue",
        "prop": "wooden_bottle"
    }'::jsonb,
    
    -- 房間 6 大家具卡槽配置 (JSONB)
    -- 範例: {"floor": "cement_gray", "wallpaper": "brick_white", "equipment": "mat_and_dumbbells", "furniture": "boombox_retro", "wall_decor": "whiteboard", "pet": "none"}
    room_config JSONB NOT NULL DEFAULT '{
        "floor": "cement_gray",
        "wallpaper": "brick_white",
        "equipment": "mat_and_dumbbells",
        "furniture": "folding_chair",
        "wall_decor": "whiteboard",
        "pet": "none"
    }'::jsonb,
    
    coins INTEGER NOT NULL DEFAULT 100 CHECK (coins >= 0), -- FTUE 新手起跑金幣 100
    streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    last_workout_date DATE DEFAULT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. 雙軌紙娃娃圖鑑與商城元資料表 (items)
-- 包含角色裝飾 (avatar_*) 與房間裝潢 (room_*)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.items (
    id TEXT PRIMARY KEY, -- 例如: 'avatar_outfit_tank_red', 'room_eq_power_rack'
    category TEXT NOT NULL CHECK (category IN (
        'avatar_body', 'avatar_face', 'avatar_hair', 'avatar_outfit', 'avatar_prop',
        'room_floor', 'room_wallpaper', 'room_equipment', 'room_furniture', 'room_wall_decor', 'room_pet'
    )),
    name TEXT NOT NULL,
    description TEXT,
    price_coins INTEGER NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    sprite_key TEXT NOT NULL, -- 對應前端 PixiJS Asset 鍵名
    is_default BOOLEAN NOT NULL DEFAULT false, -- 是否為新手預設持有
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. 玩家持有物品庫存 (user_items)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, item_id)
);

-- ------------------------------------------------------------------------------
-- 4. 任務定義表 (quests)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quests (
    id TEXT PRIMARY KEY, -- 例如: 'daily_workout_20m', 'daily_tip_friend', 'milestone_streak_7'
    type TEXT NOT NULL CHECK (type IN ('daily', 'streak', 'milestone')),
    title TEXT NOT NULL,
    description TEXT,
    target_count INTEGER NOT NULL DEFAULT 1 CHECK (target_count > 0),
    reward_coins INTEGER NOT NULL CHECK (reward_coins >= 0),
    action_type TEXT NOT NULL CHECK (action_type IN ('workout', 'tip', 'post', 'streak_maintain')),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- ------------------------------------------------------------------------------
-- 5. 玩家每日任務實例 (user_daily_quests)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL, -- 當日日期 (YYYY-MM-DD)
    current_count INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE (user_id, quest_id, quest_date)
);

-- ------------------------------------------------------------------------------
-- 6. 運動打卡紀錄 (workouts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sport_type TEXT NOT NULL CHECK (sport_type IN ('running', 'weightlifting', 'yoga', 'crossfit', 'calisthenics', 'other')),
    duration_mins INTEGER NOT NULL CHECK (duration_mins > 0),
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb, -- 例如: {"distance_km": 5.2, "sets": 12}
    input_mode TEXT NOT NULL DEFAULT 'quick_entry' CHECK (input_mode IN ('stopwatch', 'quick_entry')),
    earned_coins INTEGER NOT NULL DEFAULT 50 CHECK (earned_coins >= 0),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7. 拍立得社群動態牆貼文 (posts) - 100% 純像素無真人照片 (Zero-PII Firewall)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
    caption TEXT, -- 玩家自嘲短評或經典梗
    avatar_snapshot JSONB NOT NULL, -- 發文時之角色 5 層外觀快照
    room_snapshot JSONB NOT NULL, -- 發文時之房間裝潢快照 (作為拍立得卡片背景)
    stamp_type TEXT NOT NULL DEFAULT 'streak' CHECK (stamp_type IN ('streak', 'beast_mode', 'victory', 'sweat', 'pr_break')),
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    tips_coins_total INTEGER NOT NULL DEFAULT 0 CHECK (tips_coins_total >= 0),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends_only')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7.1 運動課表模板 (routine_templates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routine_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- 例如: '胸肩三頭 Push Day'
    sport_type TEXT NOT NULL CHECK (sport_type IN ('running', 'weightlifting', 'yoga', 'crossfit', 'calisthenics', 'other')),
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb, -- 動作清單、組數、預設重量
    is_public BOOLEAN NOT NULL DEFAULT true, -- 是否允許社群其他玩家一鍵複製
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7.2 每週分化行事曆與排程 (user_workout_schedules)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_workout_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1: 週一 ... 7: 週日
    routine_template_id UUID REFERENCES public.routine_templates(id) ON DELETE SET NULL,
    is_rest_day BOOLEAN NOT NULL DEFAULT false, -- 若為休息日，當天自動免除打卡義務保住連擊
    UNIQUE (user_id, day_of_week)
);

-- ------------------------------------------------------------------------------
-- 8. 打賞與虛擬禮物紀錄 (tips_and_gifts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tips_and_gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    gift_type TEXT NOT NULL CHECK (gift_type IN ('coin_tip', 'energy_drink')),
    coins_amount INTEGER NOT NULL CHECK (coins_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 9. 好友關係表 (friendships)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, friend_id),
    CHECK (user_id <> friend_id)
);

-- ------------------------------------------------------------------------------
-- 10. 配置化經濟參數常數表 (game_economy_config)
-- 滿足未來「數據驅動模擬與無重構熱微調」
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_economy_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 插入初期經濟基準常數 (Config-Driven Baseline)
INSERT INTO public.game_economy_config (key, value, description) VALUES
    ('ftue_starter_coins', '100'::jsonb, '新手創角首次贈送金幣'),
    ('daily_workout_coins', '50'::jsonb, '每日單次運動達成獎勵金幣'),
    ('daily_tip_reward_coins', '20'::jsonb, '每日打賞好友任務獎勵金幣'),
    ('daily_post_reward_coins', '30'::jsonb, '每日發布動態任務獎勵金幣'),
    ('streak_3d_bonus', '50'::jsonb, '連續運動 3 天額外暴擊獎勵'),
    ('streak_7d_bonus', '200'::jsonb, '連續運動 7 天黃金寶箱獎勵'),
    ('tip_single_amount', '10'::jsonb, '單次打賞好友消耗之金幣數'),
    ('gift_energy_drink_cost', '20'::jsonb, '贈送虛擬能量飲料消耗之金幣數')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 11. 原子性交易 RPC 預存程序 (Atomic RPC Functions)
-- 確保扣款、打賞與領取任務獎勵絕無併發超刷或負數漏洞
-- ------------------------------------------------------------------------------

-- [RPC 1]: 打賞好友 / 贈送能量水 (扣發送者金幣、加貼文累計與作者金幣)
CREATE OR REPLACE FUNCTION public.rpc_send_tip_or_gift(
    p_to_user_id UUID,
    p_post_id UUID,
    p_gift_type TEXT,
    p_amount INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_sender_coins INTEGER;
BEGIN
    -- 1. 檢查發送者金幣餘額
    SELECT coins INTO v_sender_coins FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
    IF v_sender_coins IS NULL OR v_sender_coins < p_amount THEN
        RAISE EXCEPTION '金幣餘額不足，無法進行打賞或送禮！';
    END IF;

    -- 2. 扣除發送者金幣
    UPDATE public.profiles SET coins = coins - p_amount WHERE id = auth.uid();

    -- 3. 增加接收者金幣 (打賞全額入帳)
    UPDATE public.profiles SET coins = coins + p_amount WHERE id = p_to_user_id;

    -- 4. 記錄交易明細
    INSERT INTO public.tips_and_gifts (from_user_id, to_user_id, post_id, gift_type, coins_amount)
    VALUES (auth.uid(), p_to_user_id, p_post_id, p_gift_type, p_amount);

    -- 5. 更新該篇貼文的打賞總額
    IF p_post_id IS NOT NULL THEN
        UPDATE public.posts SET tips_coins_total = tips_coins_total + p_amount WHERE id = p_post_id;
    END IF;

    -- 6. 自動累計發送者的「每日打賞任務」進度
    UPDATE public.user_daily_quests
    SET current_count = current_count + 1,
        is_completed = (current_count + 1 >= (SELECT target_count FROM public.quests WHERE id = 'daily_tip_friend'))
    WHERE user_id = auth.uid() AND quest_id = 'daily_tip_friend' AND quest_date = CURRENT_DATE;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [RPC 2]: 領取任務金幣獎勵
CREATE OR REPLACE FUNCTION public.rpc_claim_quest_reward(
    p_user_quest_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_reward INTEGER;
    v_claimed BOOLEAN;
    v_completed BOOLEAN;
BEGIN
    -- 鎖定任務記錄
    SELECT q.reward_coins, uq.is_claimed, uq.is_completed
    INTO v_reward, v_claimed, v_completed
    FROM public.user_daily_quests uq
    JOIN public.quests q ON uq.quest_id = q.id
    WHERE uq.id = p_user_quest_id AND uq.user_id = auth.uid()
    FOR UPDATE;

    IF v_completed IS NOT TRUE THEN
        RAISE EXCEPTION '任務尚未達成，無法領取獎勵！';
    END IF;

    IF v_claimed IS TRUE THEN
        RAISE EXCEPTION '該任務獎勵已經領取過，不可重複領取！';
    END IF;

    -- 標記為已領取
    UPDATE public.user_daily_quests
    SET is_claimed = TRUE, claimed_at = now()
    WHERE id = p_user_quest_id;

    -- 發放金幣至玩家錢包
    UPDATE public.profiles
    SET coins = coins + v_reward
    WHERE id = auth.uid();

    RETURN v_reward;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 12. Row Level Security (RLS) 安全策略
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips_and_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_economy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_schedules ENABLE ROW LEVEL SECURITY;

-- Profiles: 公開可讀 (好友參觀與廣場展示)，僅本人可修改
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Items & Quests & Economy: 全體可讀 (圖鑑與任務表)
CREATE POLICY "Items are publicly readable" ON public.items FOR SELECT USING (true);
CREATE POLICY "Quests are publicly readable" ON public.quests FOR SELECT USING (true);
CREATE POLICY "Economy config is publicly readable" ON public.game_economy_config FOR SELECT USING (true);

-- User Items: 僅本人可見
CREATE POLICY "Users can view their own inventory" ON public.user_items FOR SELECT USING (auth.uid() = user_id);

-- User Daily Quests: 僅本人可見可改
CREATE POLICY "Users can manage their daily quests" ON public.user_daily_quests FOR ALL USING (auth.uid() = user_id);

-- Workouts: 僅本人可見可寫
CREATE POLICY "Users can manage their workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id);

-- Posts: 廣場公開可讀，僅作者可發布與刪除
CREATE POLICY "Posts are publicly readable" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create their posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Tips & Gifts: 相關參與人可讀
CREATE POLICY "Users can view related tips" ON public.tips_and_gifts FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Friendships: 好友雙方可見與維護
CREATE POLICY "Users can view their friendships" ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can manage their friendships" ON public.friendships FOR ALL USING (auth.uid() = user_id);

-- Routine Templates: 公開模板全體可讀，私人僅本人可讀寫
CREATE POLICY "Public routines are readable by all" ON public.routine_templates FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own routines" ON public.routine_templates FOR ALL USING (auth.uid() = user_id);

-- Workout Schedules: 僅本人可見與維護
CREATE POLICY "Users can manage their own schedules" ON public.user_workout_schedules FOR ALL USING (auth.uid() = user_id);
