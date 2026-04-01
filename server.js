import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CONFIGURAÇÕES DE MIDDLEWARE ---
// Configurado para aceitar requisições de qualquer origem (importante para o Cineverse na Vercel)
app.use(cors({ origin: '*' })); 
app.use(express.json());

/**
 * ROTA INICIAL (Health Check)
 * Resolve o erro "Cannot GET /" e serve para verificar se o Render acordou.
 */
app.get('/', (req, res) => {
  res.json({
    status: "Online",
    projeto: "Cineverse API",
    mensagem: "O servidor está operando corretamente.",
    timestamp: new Date().toISOString()
  });
});

/**
 * ROTA: SALVAR PROXIES
 * Recebe a lista do App Cineverse e sincroniza com o arquivo TXT.
 */
app.post('/salvar-proxies', (req, res) => {
  const { lista } = req.body;
  const filePath = path.join(__dirname, 'proxies_importadas.txt');

  fs.writeFile(filePath, lista, (err) => {
    if (err) {
      console.error('[ERRO] Falha ao sincronizar TXT:', err);
      return res.status(500).json({ erro: "Erro ao salvar no servidor." });
    }
    console.log('[SISTEMA] Arquivo proxies_importadas.txt atualizado com sucesso.');
    res.send({ status: "sucesso" });
  });
});

/**
 * ROTA: TESTAR CARTÃO
 * Executa o verificador.py enviando o cartão e a proxy escolhida.
 */
app.post('/testar-cartao', (req, res) => {
  const { cartao, proxy } = req.body;
  console.log(`[LOG] Iniciando teste para o domínio playcineverse.com.br: ${cartao}`); //

  // No Render utilizamos 'python3' conforme configurado no Dockerfile.
  const pythonProcess = spawn('python3', ['verificador.py', cartao, proxy || '']);

  let output = "";
  let errorOutput = "";

  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  pythonProcess.on('close', (code) => {
    console.log(`[PYTHON OUTPUT]: ${output}`);
    
    if (errorOutput) {
      console.error(`[PYTHON ERROR]: ${errorOutput}`);
    }

    const isLive = output.includes("LIVE");
    const isDie = output.includes("DIE");
    
    // Divide a string para capturar a mensagem após os dados do cartão.
    const partes = output.split('|');
    let msgFinal = "";

    if (partes.length >= 5) {
      // Captura da mensagem real e código HTTP
      msgFinal = partes.slice(5).join(' | ').trim();
    } else {
      msgFinal = partes.length > 1 ? partes[partes.length - 1].trim() : "Sem resposta do gateway";
    }

    res.json({
      status: isLive ? 'Aprovado' : (isDie ? 'Recusado' : 'Erro'),
      msg: msgFinal, 
      tipo: isLive ? 'sucesso' : 'erro'
    });
  });
});

// --- INICIALIZAÇÃO DINÂMICA (RENDER) ---
const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log('-------------------------------------------');
  console.log(`   CINEVERSE BACKEND ATIVO NA PORTA ${PORT} `);
  console.log('   Pronto para processar requisições.      ');
  console.log('-------------------------------------------');
});