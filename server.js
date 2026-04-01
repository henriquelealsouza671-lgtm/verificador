import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CONFIGURAÇÕES DE MIDDLEWARE ---
// Origin '*' garante que o Cineverse na Vercel consiga acessar o Render sem bloqueios
app.use(cors({ origin: '*' })); 
app.use(express.json());

/**
 * ROTA INICIAL (Health Check)
 * Confirma que o servidor playcineverse.com.br está acordado
 */
app.get('/', (req, res) => {
  res.json({
    status: "Online",
    projeto: "Cineverse API",
    mensagem: "Servidor operando corretamente."
  });
});

/**
 * ROTA: SALVAR PROXIES
 * Sincroniza a lista do App com o arquivo TXT no servidor
 */
app.post('/salvar-proxies', (req, res) => {
  const { lista } = req.body;
  const filePath = path.join(__dirname, 'proxies_importadas.txt');

  fs.writeFile(filePath, lista, (err) => {
    if (err) {
      console.error('[ERRO] Falha ao sincronizar TXT:', err);
      return res.status(500).json({ erro: "Erro ao salvar no servidor." });
    }
    res.send({ status: "sucesso" });
  });
});

/**
 * ROTA: TESTAR CARTÃO
 * Executa o verificador.py e trata o retorno de forma dinâmica
 */
app.post('/testar-cartao', (req, res) => {
  const { cartao, proxy } = req.body;
  
  // No Render utilizamos 'python3' conforme o ambiente Linux
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
    
    const isLive = output.includes("LIVE");
    const isDie = output.includes("DIE");
    
    // Divide a string pelo separador '|'
    const partes = output.split('|').map(p => p.trim());
    let msgFinal = "";

    /**
     * NOVA LÓGICA DE CAPTURA:
     * O cartão sempre tem 4 partes (CC, MM, YY, CVV).
     * Se o Status (DIE/LIVE) vier separado por '|', teremos mais partes.
     */
    if (partes.length >= 7) {
      // Formato: STATUS | CC | MM | YY | CVV | MENSAGEM | HTTP
      msgFinal = partes.slice(5).join(' | ');
    } else if (partes.length === 6) {
      // Formato: STATUS-CC | MM | YY | CVV | MENSAGEM | HTTP
      msgFinal = partes.slice(4).join(' | ');
    } else {
      // Fallback: pega o último pedaço disponível
      msgFinal = partes.length > 1 ? partes[partes.length - 1] : "Sem resposta do gateway";
    }

    res.json({
      status: isLive ? 'Aprovado' : (isDie ? 'Recusado' : 'Erro'),
      msg: msgFinal, // Agora mostrará "Transação não permitida... | HTTP 200"
      tipo: isLive ? 'sucesso' : 'erro'
    });
  });
});

// --- INICIALIZAÇÃO DINÂMICA PARA O RENDER ---
const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Cineverse Backend Online na porta ${PORT}`);
});