import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fmcmnwoopbmitqufaoys.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6jC-frTceZf32cL3ZUAOqA_q5lGRM6K';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);

const homeScreen = $('homeScreen');
const gameScreen = $('gameScreen');
const notice = $('notice');

const hostName = $('hostName');
const joinName = $('joinName');
const joinCode = $('joinCode');

const createRoomBtn = $('createRoomBtn');
const joinRoomBtn = $('joinRoomBtn');
const copyCodeBtn = $('copyCodeBtn');
const leaveRoomBtn = $('leaveRoomBtn');

const roomCodeText = $('roomCodeText');
const statusPill = $('statusPill');
const gameMessage = $('gameMessage');

const hostPlayerName = $('hostPlayerName');
const guestPlayerName = $('guestPlayerName');
const hostReady = $('hostReady');
const guestReady = $('guestReady');

const hostCard = $('hostCard');
const guestCard = $('guestCard');
const hostTurnBadge = $('hostTurnBadge');
const guestTurnBadge = $('guestTurnBadge');

const secretChooser = $('secretChooser');
const guessPanel = $('guessPanel');
const finishedPanel = $('finishedPanel');

const secretInput = $('secretInput');
const saveSecretBtn = $('saveSecretBtn');
const guessInput = $('guessInput');
const guessBtn = $('guessBtn');
const lastHint = $('lastHint');

const winnerBanner = $('winnerBanner');
const playAgainBtn = $('playAgainBtn');

const historyList = $('historyList');
const chatMessages = $('chatMessages');
const chatInput = $('chatInput');
const sendChatBtn = $('sendChatBtn');

let playerId = getOrCreatePlayerId();
let currentRoom = null;
let secrets = [];
let guesses = [];
let messages = [];
let channel = null;

function getOrCreatePlayerId() {
  let id = localStorage.getItem('guess_duel_player_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('guess_duel_player_id', id);
  }
  return id;
}

function showNotice(text, isError = false) {
  notice.textContent = text;
  notice.classList.remove('hidden');
  notice.style.borderColor = isError ? 'rgba(251,113,133,.35)' : 'rgba(110,168,254,.25)';
  notice.style.background = isError ? 'rgba(251,113,133,.12)' : 'rgba(110,168,254,.12)';
}

function hideNotice() {
  notice.classList.add('hidden');
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function myName() {
  if (!currentRoom) return 'You';
  return currentRoom.host_player_id === playerId
    ? currentRoom.host_name
    : currentRoom.guest_name || 'Guest';
}

function opponentId() {
  if (!currentRoom) return null;
  return currentRoom.host_player_id === playerId
    ? currentRoom.guest_player_id
    : currentRoom.host_player_id;
}

function opponentName() {
  if (!currentRoom) return 'Opponent';
  return currentRoom.host_player_id === playerId
    ? (currentRoom.guest_name || 'Guest')
    : currentRoom.host_name;
}

function isMyTurn() {
  return currentRoom?.current_turn_player_id === playerId;
}

function isHost() {
  return currentRoom?.host_player_id === playerId;
}

function mySecretChosen() {
  return secrets.some(s => s.player_id === playerId);
}

function opponentSecretChosen() {
  const opp = opponentId();
  return !!opp && secrets.some(s => s.player_id === opp);
}

function getWinnerName() {
  if (!currentRoom?.winner_player_id) return '';
  return currentRoom.winner_player_id === currentRoom.host_player_id
    ? currentRoom.host_name
    : currentRoom.guest_name;
}

function setScreenGame() {
  homeScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

function setScreenHome() {
  gameScreen.classList.add('hidden');
  homeScreen.classList.remove('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function resetLocalState() {
  currentRoom = null;
  secrets = [];
  guesses = [];
  messages = [];
  roomCodeText.textContent = '------';
  historyList.innerHTML = '<div class="empty">No guesses yet.</div>';
  chatMessages.innerHTML = '<div class="empty">No messages yet.</div>';
  lastHint.classList.add('hidden');
  hideNotice();
}

function render() {
  if (!currentRoom) {
    setScreenHome();
    return;
  }

  setScreenGame();

  roomCodeText.textContent = currentRoom.room_code;
  hostPlayerName.textContent = currentRoom.host_name;
  guestPlayerName.textContent = currentRoom.guest_name || 'Waiting...';

  hostReady.textContent = secrets.some(s => s.player_id === currentRoom.host_player_id)
    ? 'Secret locked'
    : 'Not ready';

  guestReady.textContent = currentRoom.guest_player_id
    ? (secrets.some(s => s.player_id === currentRoom.guest_player_id) ? 'Secret locked' : 'Not ready')
    : 'Not joined';

  hostCard.classList.toggle('active', currentRoom.current_turn_player_id === currentRoom.host_player_id);
  guestCard.classList.toggle('active', currentRoom.current_turn_player_id === currentRoom.guest_player_id);

  hostTurnBadge.classList.toggle('hidden', currentRoom.current_turn_player_id !== currentRoom.host_player_id);
  guestTurnBadge.classList.toggle('hidden', currentRoom.current_turn_player_id !== currentRoom.guest_player_id);

  secretChooser.classList.add('hidden');
  guessPanel.classList.add('hidden');
  finishedPanel.classList.add('hidden');

  if (currentRoom.status === 'waiting') {
    statusPill.textContent = 'Waiting';
    gameMessage.textContent = 'Waiting for another player to join the room.';
  } else if (currentRoom.status === 'choosing') {
    statusPill.textContent = 'Choosing';
    gameMessage.textContent = mySecretChosen()
      ? 'Your number is locked. Waiting for the other player to lock theirs.'
      : 'Choose your secret number from 1 to 100.';
    if (!mySecretChosen()) secretChooser.classList.remove('hidden');
  } else if (currentRoom.status === 'playing') {
    statusPill.textContent = 'Playing';
    gameMessage.textContent = isMyTurn()
      ? `Your turn. Guess ${opponentName()}'s number.`
      : `${opponentName()} is taking their turn.`;
    guessPanel.classList.remove('hidden');
    guessInput.disabled = !isMyTurn();
    guessBtn.disabled = !isMyTurn();
  } else if (currentRoom.status === 'finished') {
    statusPill.textContent = 'Finished';
    gameMessage.textContent = `${getWinnerName()} guessed correctly.`;
    finishedPanel.classList.remove('hidden');
    winnerBanner.textContent = `Winner: ${getWinnerName()}`;
  }

  renderHistory();
  renderMessages();
}

function renderHistory() {
  if (!guesses.length) {
    historyList.innerHTML = '<div class="empty">No guesses yet.</div>';
    return;
  }

  const sorted = [...guesses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  historyList.innerHTML = sorted.map(g => {
    const guesserName =
      g.guesser_player_id === currentRoom.host_player_id
        ? currentRoom.host_name
        : currentRoom.guest_name;

    return `
      <div class="history-item">
        <strong>${escapeHtml(guesserName)}</strong>
        guessed <strong>${g.guessed_number}</strong>
        → <strong>${g.result.toUpperCase()}</strong>
      </div>
    `;
  }).join('');
}

function renderMessages() {
  if (!messages.length) {
    chatMessages.innerHTML = '<div class="empty">No messages yet.</div>';
    return;
  }

  chatMessages.innerHTML = messages.map(m => `
    <div class="chat-bubble ${m.player_id === playerId ? 'mine' : ''}">
      <div class="chat-name">${escapeHtml(m.player_name)}</div>
      <div>${escapeHtml(m.content)}</div>
    </div>
  `).join('');

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadRoomData(roomId) {
  const [roomRes, secretsRes, guessesRes, messagesRes] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase.from('secrets').select('*').eq('room_id', roomId),
    supabase.from('guesses').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
    supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true })
  ]);

  if (roomRes.error) {
    showNotice(roomRes.error.message, true);
    return;
  }

  currentRoom = roomRes.data;
  secrets = secretsRes.data || [];
  guesses = guessesRes.data || [];
  messages = messagesRes.data || [];

  const myLastGuess = [...guesses]
    .filter(g => g.guesser_player_id === playerId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  if (myLastGuess && currentRoom.status !== 'finished') {
    lastHint.classList.remove('hidden');
    if (myLastGuess.result === 'higher') {
      lastHint.textContent = `Hint: go higher than ${myLastGuess.guessed_number}.`;
    } else if (myLastGuess.result === 'lower') {
      lastHint.textContent = `Hint: go lower than ${myLastGuess.guessed_number}.`;
    } else {
      lastHint.textContent = 'Correct!';
    }
  } else if (currentRoom.status === 'finished') {
    lastHint.classList.add('hidden');
  }

  render();
}

async function subscribeRoom(roomId) {
  if (channel) {
    await supabase.removeChannel(channel);
  }

  channel = supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'secrets', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guesses', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, () => loadRoomData(roomId))
    .subscribe();

  await loadRoomData(roomId);
}

async function createRoom() {
  hideNotice();

  const name = hostName.value.trim();
  if (!name) {
    showNotice('Enter your name first.', true);
    return;
  }

  const room_code = generateRoomCode();

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      room_code,
      host_name: name,
      host_player_id: playerId,
      status: 'waiting'
    })
    .select()
    .single();

  if (error) {
    showNotice(error.message, true);
    return;
  }

  await subscribeRoom(data.id);
  showNotice('Room created. Share the code with your friend.');
}

async function joinRoom() {
  hideNotice();

  const name = joinName.value.trim();
  const code = joinCode.value.trim().toUpperCase();

  if (!name || !code) {
    showNotice('Enter your name and room code.', true);
    return;
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', code)
    .single();

  if (roomError || !room) {
    showNotice('Room not found.', true);
    return;
  }

  if (room.guest_player_id && room.guest_player_id !== playerId) {
    showNotice('This room is already full.', true);
    return;
  }

  const { data, error } = await supabase
    .from('rooms')
    .update({
      guest_name: name,
      guest_player_id: playerId,
      status: 'choosing'
    })
    .eq('id', room.id)
    .select()
    .single();

  if (error) {
    showNotice(error.message, true);
    return;
  }

  await subscribeRoom(data.id);
  showNotice('Joined room. Choose your secret number.');
}

async function saveSecret() {
  if (!currentRoom) return;

  const num = Number(secretInput.value);
  if (!Number.isInteger(num) || num < 1 || num > 100) {
    showNotice('Secret number must be between 1 and 100.', true);
    return;
  }

  const already = secrets.find(s => s.player_id === playerId);
  if (already) {
    showNotice('You already locked your secret number.', true);
    return;
  }

  const { error } = await supabase.from('secrets').insert({
    room_id: currentRoom.id,
    player_id: playerId,
    secret_number: num
  });

  if (error) {
    showNotice(error.message, true);
    return;
  }

  const { data: allSecrets } = await supabase
    .from('secrets')
    .select('*')
    .eq('room_id', currentRoom.id);

  if ((allSecrets || []).length === 2) {
    await supabase
      .from('rooms')
      .update({
        status: 'playing',
        current_turn_player_id: currentRoom.host_player_id,
        winner_player_id: null
      })
      .eq('id', currentRoom.id);
  }

  secretInput.value = '';
  showNotice('Your number is locked.');
}

async function makeGuess() {
  if (!currentRoom) return;

  if (!isMyTurn()) {
    showNotice('It is not your turn.', true);
    return;
  }

  const num = Number(guessInput.value);
  if (!Number.isInteger(num) || num < 1 || num > 100) {
    showNotice('Guess must be between 1 and 100.', true);
    return;
  }

  const oppId = opponentId();
  if (!oppId) {
    showNotice('Opponent not ready.', true);
    return;
  }

  const { data: oppSecret, error: secretError } = await supabase
    .from('secrets')
    .select('*')
    .eq('room_id', currentRoom.id)
    .eq('player_id', oppId)
    .single();

  if (secretError || !oppSecret) {
    showNotice('Opponent secret number not found.', true);
    return;
  }

  let result = 'correct';
  if (num < oppSecret.secret_number) result = 'higher';
  if (num > oppSecret.secret_number) result = 'lower';

  const { error: guessError } = await supabase.from('guesses').insert({
    room_id: currentRoom.id,
    guesser_player_id: playerId,
    target_player_id: oppId,
    guessed_number: num,
    result
  });

  if (guessError) {
    showNotice(guessError.message, true);
    return;
  }

  if (result === 'correct') {
    await supabase
      .from('rooms')
      .update({
        status: 'finished',
        winner_player_id: playerId,
        current_turn_player_id: null
      })
      .eq('id', currentRoom.id);

    showNotice('Correct guess. You won!');
  } else {
    await supabase
      .from('rooms')
      .update({
        current_turn_player_id: oppId
      })
      .eq('id', currentRoom.id);

    showNotice(result === 'higher' ? 'Higher.' : 'Lower.');
  }

  guessInput.value = '';
}

async function sendMessage() {
  if (!currentRoom) return;

  const content = chatInput.value.trim();
  if (!content) return;

  const { error } = await supabase.from('messages').insert({
    room_id: currentRoom.id,
    player_id: playerId,
    player_name: myName(),
    content
  });

  if (error) {
    showNotice(error.message, true);
    return;
  }

  chatInput.value = '';
}

async function playAgain() {
  if (!currentRoom) return;

  await supabase.from('secrets').delete().eq('room_id', currentRoom.id);
  await supabase.from('guesses').delete().eq('room_id', currentRoom.id);

  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'choosing',
      current_turn_player_id: null,
      winner_player_id: null
    })
    .eq('id', currentRoom.id);

  if (error) {
    showNotice(error.message, true);
    return;
  }

  showNotice('New round started. Choose a new secret number.');
}

async function leaveRoom() {
  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }

  resetLocalState();
  render();
}

async function copyCode() {
  if (!currentRoom) return;
  await navigator.clipboard.writeText(currentRoom.room_code);
  showNotice('Room code copied.');
}

createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
saveSecretBtn.addEventListener('click', saveSecret);
guessBtn.addEventListener('click', makeGuess);
sendChatBtn.addEventListener('click', sendMessage);
playAgainBtn.addEventListener('click', playAgain);
copyCodeBtn.addEventListener('click', copyCode);
leaveRoomBtn.addEventListener('click', leaveRoom);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

joinCode.addEventListener('input', () => {
  joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

render();