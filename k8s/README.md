# Deploy com Argo CD

Este diretório contém os manifestos Kubernetes do `warm-up-bot` usando Kustomize.

## Recursos incluídos

- `namespace.yaml`: namespace `warm-up-bot`
- `configmap.yaml`: variáveis não sensíveis da aplicação
- `secret.yaml`: variáveis sensíveis (placeholder para trocar antes de produção)
- `mysql.yaml`: MySQL + PVC + Service interno
- `app.yaml`: Deployment e Service da aplicação

## Ajustes obrigatórios antes do primeiro sync

1. Atualize a imagem em `app.yaml` (`ghcr.io/jhowbhz/warm-up-bot:latest`) para a imagem/tag que você publica.
2. Troque os valores em `secret.yaml`:
   - `ENCRYPTION_KEY`
   - `DB_PASS`
   - `JWT_SECRET`
3. Crie o secret para pull da imagem privada no GHCR:

```bash
kubectl -n warm-up-bot create secret docker-registry ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username=SEU_USUARIO_GITHUB \
  --docker-password=SEU_PAT_COM_read:packages \
  --docker-email=seu-email@exemplo.com
```

4. Se necessário, ajuste recursos, storage class e réplicas conforme seu cluster.

## Teste local dos manifestos

```bash
kubectl apply -k k8s/
kubectl -n warm-up-bot get pods,svc,pvc
```

## Argo CD

Há um `Application` pronto em `argocd/warm-up-bot-application.yaml`.
Se seu repositório/branch for diferente, ajuste:

- `spec.source.repoURL`
- `spec.source.targetRevision`
