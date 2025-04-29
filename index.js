const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const moment = require('moment');
const Sentiment = require('sentiment');
const { v4: uuidv4 } = require('uuid');

const sentiment = new Sentiment();
const storageFile = './storage/data.json';
const BOT_NAME = 'Sashin';
const OWNER_NUMBERS = ['+50955099125', '+50942521769'];
const OWNER_NAMES = ['satoshin', 'satoshi', 'satou', 'sat'];

let botActive = true;
let memory = { orders: {}, settings: {}, blacklist: [] };

if (fs.existsSync(storageFile)) {
  memory = JSON.parse(fs.readFileSync(storageFile));
}

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log(`${BOT_NAME} est prêt.`));

function isOwner(message) {
  return OWNER_NUMBERS.includes(message.from) || OWNER_NAMES.some(name => message.body.toLowerCase().includes(name));
}

function saveMemory() {
  fs.writeFileSync(storageFile, JSON.stringify(memory, null, 2));
}

function analyzeCommand(msg, sender) {
  const text = msg.body.toLowerCase();

  // Activation / désactivation
  if (text.includes(`${BOT_NAME.toLowerCase()} on`) && isOwner(msg)) {
    botActive = true;
    return msg.reply('Activation confirmée.');
  }
  if (text.includes(`${BOT_NAME.toLowerCase()} off`) && isOwner(msg)) {
    botActive = false;
    return msg.reply('Désactivation confirmée.');
  }

  if (!botActive && !isOwner(msg)) return;

  // Apprentissage / Ordre
  if (isOwner(msg)) {
    if (text.includes('apprend') || text.includes('apprendre')) {
      const id = uuidv4();
      memory.orders[id] = { text: msg.body, from: sender, date: new Date().toISOString() };
      saveMemory();
      return msg.reply('Nouvel ordre appris.');
    }
    if (text.includes('oublie')) {
      memory.orders = {};
      saveMemory();
      return msg.reply('Tous les ordres ont été oubliés.');
    }
  }

  // Blocage d'utilisateur
  if (isOwner(msg) && text.includes('ignore')) {
    const number = msg.mentionedIds[0] || msg.body.match(/\+\d+/g)?.[0];
    if (number) {
      memory.blacklist.push(number);
      saveMemory();
      return msg.reply(`L'utilisateur ${number} a été ignoré.`);
    }
  }

  // Réponse émotionnelle si mentionné
  const mentionRegex = new RegExp(BOT_NAME, 'i');
  if (mentionRegex.test(msg.body) && !memory.blacklist.includes(sender)) {
    const score = sentiment.analyze(msg.body).score;
    const hour = moment().tz('America/Port-au-Prince').hour();
    let emotion = 'neutre';
    if (score > 1) emotion = 'heureux';
    else if (score < -1) emotion = 'triste';
    if (hour > 22 || hour < 5) emotion = 'fatigué';

    const response = `Je suis ${emotion} en ce moment. Que puis-je faire pour toi ?`;
    return msg.reply(response);
  }
}

client.on('message', msg => analyzeCommand(msg, msg.from));
client.initialize();
