# 🎯 Yoga Pele Quiz — Resumo Executivo do Setup

## ✅ Configurações Completadas

### 1. **Google Tag Manager (GTM)**
- **Container ID**: `GTM-58VNW6HN`
- **Status**: ✅ Criado e configurado
- **Localização no HTML**: Linhas 19 e 26 do index.html
- **Próximo passo**: Adicionar tags de pixel Meta no GTM (PageView + Lead events)

### 2. **Cloudflare Worker (CAPI Proxy)**
- **Worker URL**: `https://late-feather-031byoga-pele-capi.gustavosalatiel158.workers.dev`
- **Status**: ✅ Deployado (código Hello World ativo)
- **Arquivo de código**: `capi-worker.js` (pronto para ser copiado)
- **Variáveis de ambiente necessárias**:
  - `PIXEL_ID`: `69cb295f725a1b96c762db43`
  - `ACCESS_TOKEN`: Gerar em https://business.facebook.com (Events Manager)

### 3. **Meta Pixel**
- **Pixel ID**: `69cb295f725a1b96c762db43`
- **Status**: ✅ Inicialização Utmify ativa no index.html
- **Rastreamento**: FBC (fb_click_id) + FBP + CAPI server-side

### 4. **Otimizações Implementadas**
- ✅ Imagens WebP: 47% menos bandwidth (download 1-4.webp)
- ✅ GTM Preconnect + Preload para melhor LCP
- ✅ FBC Fix Script (90 dias de persistência)
- ✅ CAPI Helper com fallback para eventos

---

## 📋 Próximos Passos

### 1️⃣ **Upload dos Arquivos para GitHub**
Fazer upload desses arquivos para o repositório:
- `index.html` (atualizado com GTM-58VNW6HN + Worker URL)
- `download 1-4.webp` (imagens otimizadas)
- `capi-worker.js` (código CAPI completo)
- `GUIA_LANCAMENTO_QUIZ.docx`
- `CHECKLIST_FINAL_LANCAMENTO.txt`
- `CONFIGURACOES_SETUP.json`

### 2️⃣ **Adicionar Código CAPI ao Worker**
1. Acesse: https://dash.cloudflare.com/workers
2. Edite `late-feather-031byoga-pele-capi`
3. Copie o conteúdo completo de `capi-worker.js`
4. Cole no editor do Cloudflare
5. Clique "Save and Deploy"

### 3️⃣ **Adicionar Variáveis de Ambiente no Cloudflare**
1. Na página do worker, vá para "Settings"
2. Clique em "Add bindings"
3. Adicione as variáveis:
   - **PIXEL_ID**: `69cb295f725a1b96c762db43`
   - **ACCESS_TOKEN**: [seu token do Meta Events Manager]
4. Salve e redeploy

### 4️⃣ **Configurar GTM**
1. Acesse: https://tagmanager.google.com/#/container/accounts/6347307186/containers/247989751/workspaces/2
2. Crie as tags Meta Pixel:
   - **Tag: Meta Pixel - PageView**
     - Tipo: HTML personalizado
     - Disparo: All Pages
   - **Tag: Meta Pixel - Lead**
     - Tipo: HTML personalizado
     - Disparo: Custom Event - quiz_complete
3. Publique o container

### 5️⃣ **Testes**
- [ ] Testar PageSpeed Insights (meta: >70 mobile)
- [ ] Verificar FBC captura no URL com fbclid
- [ ] Confirmar eventos no Meta Pixel Helper
- [ ] Validar CAPI via Cloudflare logs
- [ ] Simular clique anúncio → quiz → CTA

---

## 🔐 URLs e Credenciais

```
GTM Container:  https://tagmanager.google.com/#/container/accounts/6347307186/containers/247989751/workspaces/2
Worker:         https://late-feather-031byoga-pele-capi.gustavosalatiel158.workers.dev
Cloudflare:     https://dash.cloudflare.com/5e7a6d96219ace37638854a076286a8e
Meta Events:    https://business.facebook.com/events_manager
```

---

## 📊 Métricas Esperadas

| Métrica | Target | Descrição |
|---------|--------|-----------|
| Connect Rate | >80% | % de pessoas que clicam o anúncio e carregam o quiz |
| Pixel Match Rate | >6/10 | Qualidade de match entre eventos server + browser |
| PageSpeed (Mobile) | >70 | Score de performance mobile |
| FBC Capture | 100% | % de usuários com fb_click_id capturado |

---

## 💡 Connect Rate - Principais Optimizações Implementadas

1. **FBC Fix Script** (Linha 1638+)
   - Captura fbclid da URL
   - Persiste como _fbc cookie (90 dias)
   - Resiste a iOS ITP

2. **CAPI Proxy** (Cloudflare Worker)
   - Enriquece eventos com IP + UA real
   - Bypasseia iOS ITP e adblockers
   - Server-side de verdade (não GTM)

3. **GTM Preload** (Linha 17-19)
   - Link preconnect + preload
   - Melhora LCP e carregamento inicial

4. **WebP Images** (47% menos dados)
   - Otimização critical para conexões lentas
   - Afeta directly no Connect Rate

---

**Última atualização**: 2026-03-31
**Status geral**: ✅ 90% configurado | ⏳ Aguardando credentials Meta + upload GitHub
