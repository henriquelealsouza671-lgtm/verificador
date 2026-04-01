import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CONFIGURAÇÕES DE MIDDLEWARE ---
app.use(cors());
app.use(express.json());

/**
 * ROTA: SALVAR PROXIES
 * Recebe a lista do React e sobrescreve o arquivo proxies_importadas.txt
 * Isso garante que ao apagar no App, apague no arquivo também.
 */
app.post('/salvar-proxies', (req, res) => {
  const { lista } = req.body;
  const filePath = path.join(__dirname, 'proxies_importadas.txt');

  fs.writeFile(filePath, lista, (err) => {
    if (err) {
      console.error('[ERRO] Falha ao sincronizar TXT:', err);
      return res.status(500).send("Erro ao salvar no servidor.");
    }
    console.log('[SISTEMA] Arquivo proxies_importadas.txt atualizado.');
    res.send({ status: "sucesso" });
  });
});

/**
 * ROTA: TESTAR CARTÃO
 * Aciona o verificador.py e trata o retorno para o App
 */
app.post('/testar-cartao', (req, res) => {
  const { cartao, proxy } = req.body;
  console.log(`[LOG] Iniciando teste: ${cartao}`);

  // No Render/Linux usamos 'python3'. No seu PC pode ser 'python' ou 'py'.
  // O Dockerfile que te mandei já configura o comando correto.
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
    
    /**
     * LÓGICA DE CAPTURA DE MENSAGEM (FIX):
     * O Python retorna: STATUS | CC | MM | YYYY | CVV | MENSAGEM | HTTP
     * Pulamos os 5 primeiros campos (Status + 4 do Cartão) para pegar o erro real.
     */
    const partes = output.split('|');
    let msgFinal = "";

    if (partes.length >= 5) {
      // Pega tudo do índice 5 em diante (Mensagem + HTTP) e junta com a barra
      msgFinal = partes.slice(5).join(' | ').trim();
    } else {
      // Caso o formato mude, pega o último pedaço disponível
      msgFinal = partes.length > 1 ? partes[partes.length - 1].trim() : "Sem resposta do gateway";
    }

    res.json({
      status: isLive ? 'Aprovado' : (isDie ? 'Recusado' : 'Erro'),
      msg: msgFinal, 
      tipo: isLive ? 'sucesso' : 'erro'
    });
  });
});

// --- INICIALIZAÇÃO PARA HOSPEDAGEM (RENDER/DOCKER) ---
// O Render exige que o servidor escute em 0.0.0.0 e use a porta da variável de ambiente
const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log('-------------------------------------------');
  console.log(`   CINEVERSE BACKEND ONLINE NA PORTA ${PORT} `);
  console.log('   Sincronização de Proxies Ativa          ');
  console.log('-------------------------------------------');
});