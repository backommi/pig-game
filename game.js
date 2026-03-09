// 小猪养成记 - H5版本游戏逻辑

// 饲料配置
const FEEDS = [
    { id: '厨余饲料', name: '厨余饲料', emoji: '🗑️', color: '#95A5A6', pricePerKg: 1.7, protein: 5, growthValue: 2 },
    { id: '玉米', name: '玉米', emoji: '🌽', color: '#FFD93D', pricePerKg: 2.4, protein: 8, growthValue: 3 },
    { id: '豆粕', name: '豆粕', emoji: '🫘', color: '#D4A574', pricePerKg: 14.6, protein: 44, growthValue: 15 },
    { id: '鱼粉', name: '鱼粉', emoji: '🐟', color: '#6BCB77', pricePerKg: 17.0, protein: 60, growthValue: 20 }
];

// 小猪阶段
const PIG_STAGES = [
    { minWeight: 0, maxWeight: 15, emoji: '🐷', name: '乳猪' },
    { minWeight: 15, maxWeight: 30, emoji: '🐽', name: '幼猪' },
    { minWeight: 30, maxWeight: 60, emoji: '🐖', name: '小猪' },
    { minWeight: 60, maxWeight: 90, emoji: '🐗', name: '中猪' },
    { minWeight: 90, maxWeight: 110, emoji: '🥓', name: '大猪' },
    { minWeight: 110, maxWeight: 130, emoji: '🍖', name: '肥猪' },
    { minWeight: 130, maxWeight: 999, emoji: '🏆', name: '出栏猪' }
];

// 游戏状态
let gameState = {
    week: 1,
    coins: 2000,
    pig: { weight: 5, health: 100, happiness: 80 }
};

let costs = { feed: 0, other: 500 };
let combo = 0, maxCombo = 0, isFeeding = false, feedProgress = 0;
let luckyMode = false, escapeMode = false, priceMultiplier = 1.0;
let feedTimer = null, eventTimer = null;

// 初始化
function initGame() {
    gameState = { week: 1, coins: 2000, pig: { weight: 5, health: 100, happiness: 80 } };
    costs = { feed: 0, other: 500 };
    combo = 0; maxCombo = 0; isFeeding = false;
    luckyMode = false; escapeMode = false; priceMultiplier = 1.0;
    
    if (feedTimer) clearInterval(feedTimer);
    if (eventTimer) clearTimeout(eventTimer);
    
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('shareSection').style.display = 'none';
    
    renderFeeds();
    updateUI();
    startEventTimer();
}

// 获取小猪阶段
function getPigStage() {
    for (let i = PIG_STAGES.length - 1; i >= 0; i--) {
        if (gameState.pig.weight >= PIG_STAGES[i].minWeight) {
            return PIG_STAGES[i];
        }
    }
    return PIG_STAGES[0];
}

// 渲染饲料列表
function renderFeeds() {
    const list = document.getElementById('feedList');
    list.innerHTML = FEEDS.map(feed => `
        <div class="feed-card ${gameState.coins < feed.pricePerKg ? 'disabled' : ''} ${escapeMode && feed.id !== '鱼粉' ? 'escape-warn' : ''}"
             style="background:${feed.color}"
             onclick="selectFeed('${feed.id}')">
            <div class="feed-emoji">${feed.emoji}</div>
            <div class="feed-name">${feed.name}</div>
            <div class="feed-price">${feed.pricePerKg}元/kg</div>
            <div class="feed-protein">蛋白质${feed.protein}%</div>
            <div class="feed-bonus">+${feed.growthValue}kg</div>
        </div>
    `).join('');
}

// 选择饲料
function selectFeed(feedId) {
    if (isFeeding) return;
    
    if (escapeMode && feedId !== '鱼粉') {
        alert('小猪不满意！用鱼粉挽留它！');
        return;
    }
    
    const feed = FEEDS.find(f => f.id === feedId);
    if (gameState.coins < feed.pricePerKg) {
        alert('资金不足！');
        return;
    }
    
    gameState.coins -= feed.pricePerKg;
    costs.feed += feed.pricePerKg;
    
    isFeeding = true;
    feedProgress = 0;
    
    document.getElementById('feedSection').style.display = 'none';
    document.getElementById('actionSection').style.display = 'none';
    document.getElementById('feedingHint').style.display = 'block';
    document.getElementById('timingBar').style.display = 'block';
    document.getElementById('pigAvatar').classList.add('feeding');
    
    // 开始进度条
    const speeds = { '厨余饲料': 2, '玉米': 2.5, '豆粕': 3.5, '鱼粉': 5 };
    const speed = speeds[feedId] || 3;
    
    feedTimer = setInterval(() => {
        feedProgress += speed;
        document.getElementById('timingProgress').style.width = feedProgress + '%';
        
        if (feedProgress >= 100) {
            clearInterval(feedTimer);
            onFeedMiss();
        }
    }, 50);
    
    // 保存当前饲料
    window.currentFeed = feed;
}

// 点击小猪喂食
document.getElementById('pigAvatar').addEventListener('click', function() {
    if (!isFeeding) return;
    
    clearInterval(feedTimer);
    
    if (feedProgress >= 80 && feedProgress <= 100) {
        onFeedSuccess(feedProgress >= 90);
    } else if (feedProgress >= 60) {
        onFeedSuccess(false);
    } else {
        onFeedEarly();
    }
});

// 喂食成功
function onFeedSuccess(isPerfect) {
    isFeeding = false;
    const feed = window.currentFeed;
    
    let weightGain = feed.growthValue;
    let healthGain = 2;
    combo++;
    
    if (isPerfect) {
        weightGain *= 1.5;
        healthGain = 5;
        if (combo > 1) weightGain *= (1 + combo * 0.1);
    }
    
    if (luckyMode) {
        weightGain *= 2;
        luckyMode = false;
    }
    
    if (escapeMode && feed.id === '鱼粉') {
        weightGain *= 1.5;
        escapeMode = false;
    }
    
    maxCombo = Math.max(maxCombo, combo);
    
    gameState.pig.weight += weightGain;
    gameState.pig.health = Math.min(100, gameState.pig.health + healthGain);
    gameState.pig.happiness = Math.min(100, gameState.pig.happiness + 3);
    
    // 动画
    const pig = document.getElementById('pigAvatar');
    pig.classList.remove('feeding');
    pig.classList.add(isPerfect ? 'happy' : 'eat');
    setTimeout(() => pig.classList.remove('happy', 'eat'), 500);
    
    // 震动反馈
    if (navigator.vibrate) {
        navigator.vibrate(isPerfect ? [100, 50, 100] : 50);
    }
    
    resetFeedingUI();
    updateUI();
    
    if (gameState.pig.weight >= 110) {
        setTimeout(endGame, 1000);
    }
}

// 喂食失败
function onFeedMiss() {
    isFeeding = false;
    combo = 0;
    document.getElementById('pigAvatar').classList.remove('feeding');
    document.getElementById('pigAvatar').classList.add('sad');
    setTimeout(() => document.getElementById('pigAvatar').classList.remove('sad'), 500);
    resetFeedingUI();
}

// 点太早
function onFeedEarly() {
    isFeeding = false;
    combo = 0;
    gameState.pig.health = Math.max(0, gameState.pig.health - 3);
    document.getElementById('pigAvatar').classList.remove('feeding');
    document.getElementById('pigAvatar').classList.add('angry');
    setTimeout(() => document.getElementById('pigAvatar').classList.remove('angry'), 500);
    resetFeedingUI();
    updateUI();
}

// 重置喂食UI
function resetFeedingUI() {
    document.getElementById('feedingHint').style.display = 'none';
    document.getElementById('timingBar').style.display = 'none';
    document.getElementById('feedSection').style.display = 'block';
    document.getElementById('actionSection').style.display = 'flex';
    document.getElementById('timingProgress').style.width = '0%';
    renderFeeds();
}

// 下一周
document.getElementById('nextWeekBtn').addEventListener('click', function() {
    gameState.week++;
    
    const healthFactor = gameState.pig.health / 100;
    gameState.pig.weight += 3 * healthFactor;
    
    gameState.coins -= 50;
    costs.other += 50;
    
    gameState.pig.health = Math.max(50, gameState.pig.health - 5);
    gameState.pig.happiness = Math.max(50, gameState.pig.happiness - 3);
    
    combo = 0;
    
    if (navigator.vibrate) navigator.vibrate(30);
    
    updateUI();
    
    if (gameState.week >= 12 || gameState.pig.weight >= 130) {
        setTimeout(endGame, 500);
    }
});

// 随机事件
function startEventTimer() {
    const delay = 8000 + Math.random() * 7000;
    eventTimer = setTimeout(() => {
        triggerEvent();
    }, delay);
}

function triggerEvent() {
    const events = [
        { emoji: '💩', msg: '小猪拉肚子了！', effect: () => gameState.pig.health -= 10 },
        { emoji: '🌧️', msg: '天气不好，食欲下降！', effect: () => {} },
        { emoji: '☀️', msg: '天气真好，小猪很开心！', effect: () => gameState.pig.happiness += 10 },
        { emoji: '🎁', msg: '发现饲料优惠券！', effect: () => gameState.coins += 200 },
        { emoji: '🏃', msg: '小猪不满意，想要逃跑！', effect: () => { escapeMode = true; } },
        { emoji: '✨', msg: '🎉 金猪出现！成长+30kg！', effect: () => { gameState.pig.weight += 30; } }
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    event.effect();
    
    // 显示事件
    const popup = document.getElementById('eventPopup');
    document.getElementById('eventEmoji').textContent = event.emoji;
    document.getElementById('eventText').textContent = event.msg;
    popup.classList.add('show');
    
    if (navigator.vibrate) navigator.vibrate(50);
    
    setTimeout(() => {
        popup.classList.remove('show');
    }, 3000);
    
    updateUI();
    startEventTimer();
}

// 更新UI
function updateUI() {
    const stage = getPigStage();
    
    document.getElementById('weekText').textContent = `第${gameState.week}周`;
    document.getElementById('coinsText').textContent = Math.floor(gameState.coins);
    document.getElementById('totalCost').textContent = Math.floor(costs.feed + costs.other);
    document.getElementById('feedCost').textContent = Math.floor(costs.feed);
    document.getElementById('otherCost').textContent = Math.floor(costs.other);
    
    document.getElementById('stageBadge').textContent = stage.name;
    document.getElementById('pigAvatar').textContent = stage.emoji;
    document.getElementById('weightText').textContent = gameState.pig.weight.toFixed(1) + 'kg';
    
    // 小猪大小随体重变化
    const size = Math.min(200, 100 + Math.floor(gameState.pig.weight));
    document.getElementById('pigAvatar').style.fontSize = size + 'px';
    document.getElementById('pigShadow').style.width = (size * 0.8) + 'px';
    
    // 逃跑动画
    if (escapeMode) {
        document.getElementById('pigAvatar').classList.add('escape');
    } else {
        document.getElementById('pigAvatar').classList.remove('escape');
    }
    
    document.getElementById('healthBar').style.width = gameState.pig.health + '%';
    document.getElementById('healthText').textContent = Math.floor(gameState.pig.health) + '%';
    document.getElementById('happyBar').style.width = gameState.pig.happiness + '%';
    document.getElementById('happyText').textContent = Math.floor(gameState.pig.happiness) + '%';
    
    // 连击显示
    if (combo > 1) {
        document.getElementById('comboBox').style.display = 'flex';
        document.getElementById('comboText').textContent = 'x' + combo;
    } else {
        document.getElementById('comboBox').style.display = 'none';
    }
    
    // 特殊状态
    document.getElementById('luckyStatus').style.display = luckyMode ? 'block' : 'none';
    document.getElementById('escapeStatus').style.display = escapeMode ? 'block' : 'none';
    
    // 饲料标题
    document.getElementById('feedTitle').textContent = escapeMode ? '⚠️ 用鱼粉挽留小猪!' : '选择饲料 (每次1kg)';
    
    // 下一周按钮
    document.getElementById('nextWeekBtn').textContent = `⏭️ 进入第${gameState.week + 1}周`;
    
    renderFeeds();
}

// 游戏结束
function endGame() {
    if (eventTimer) clearTimeout(eventTimer);
    
    // 计算评级
    const weightScore = Math.min(100, (gameState.pig.weight / 130) * 100);
    const totalScore = weightScore * 0.5 + gameState.pig.health * 0.3 + Math.min(100, maxCombo * 10) * 0.2;
    
    let rating, multiplier;
    if (totalScore >= 90) { rating = '⭐⭐⭐⭐⭐'; multiplier = 2.2; }
    else if (totalScore >= 75) { rating = '⭐⭐⭐⭐'; multiplier = 1.7; }
    else if (totalScore >= 60) { rating = '⭐⭐⭐'; multiplier = 1.2; }
    else if (totalScore >= 40) { rating = '⭐⭐'; multiplier = 0.8; }
    else { rating = '⭐'; multiplier = 0.5; }
    
    const titles = { '⭐⭐⭐⭐⭐': '猪王', '⭐⭐⭐⭐': '优质猪', '⭐⭐⭐': '普通猪', '⭐⭐': '瘦弱猪', '⭐': '病猪' };
    
    const finalPrice = Math.round(gameState.pig.weight * 20 * multiplier * priceMultiplier);
    const profit = finalPrice - costs.feed - costs.other;
    
    // 显示结果
    document.getElementById('ratingStars').textContent = rating;
    document.getElementById('ratingTitle').textContent = titles[rating];
    document.getElementById('finalPrice').textContent = finalPrice;
    document.getElementById('finalFeedCost').textContent = Math.floor(costs.feed);
    document.getElementById('finalOtherCost').textContent = Math.floor(costs.other);
    document.getElementById('profitText').textContent = (profit >= 0 ? '+' : '') + profit + '元';
    document.getElementById('profitText').className = 'finance-value profit ' + (profit >= 0 ? 'positive' : 'negative');
    document.getElementById('finalWeight').textContent = gameState.pig.weight.toFixed(1) + 'kg';
    document.getElementById('finalCombo').textContent = 'x' + maxCombo;
    
    document.getElementById('gameOverModal').style.display = 'flex';
    
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
}

// 重新开始
document.getElementById('restartBtn').addEventListener('click', initGame);

// 分享
document.getElementById('shareBtn').addEventListener('click', function() {
    const shareSection = document.getElementById('shareSection');
    const shareUrl = document.getElementById('shareUrl');
    
    // 获取当前URL
    const url = window.location.href;
    shareUrl.textContent = url;
    shareSection.style.display = 'block';
    
    // 复制到剪贴板
    navigator.clipboard.writeText(url).then(() => {
        alert('链接已复制到剪贴板！');
    });
});

// 启动游戏
initGame();

// 防止双击缩放
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);