# Desafio Programático: Sistema de Automação de Pivô Central de Irrigação

## 1. Introdução

Este documento descreve um desafio programático fullstack focado no desenvolvimento de um sistema de automação e monitoramento para pivôs centrais de irrigação. O objetivo é simular um ambiente real onde dispositivos IoT (pivôs) se comunicam com um backend robusto e um frontend interativo, proporcionando uma experiência completa de desenvolvimento de software.

## 2. Objetivo

O principal objetivo deste desafio é construir um sistema que permita o **cadastro, controle (ligar/desligar) e monitoramento em tempo real** de pivôs de irrigação. O sistema deve registrar a movimentação e o histórico de irrigação de cada pivô, utilizando comunicação MQTT para dados do dispositivo e WebSockets para a atualização em tempo real no frontend.

## 3. Arquitetura Proposta

A arquitetura do sistema será dividida em duas partes principais: Frontend e Backend, com comunicação assíncrona e em tempo real entre eles e com os dispositivos IoT.

### 3.1. Frontend

O frontend será a interface, web e mobile, do usuário para interagir com o sistema, visualizar o status dos pivôs e acessar o histórico de operações.
Segue as telas a serem desenvolvidas: https://www.figma.com/design/BJMxF5PkIAA2RZSu0fgXb8/Processo_Seletivo_Soil?node-id=0-1&t=GtOcCHgapUUlfhPB-1

* **Tecnologias:**
    * **Next.js** [1]: Framework React para aplicações web de alto desempenho.
    * **JWT (JSON Web Tokens)** [2]: Para autenticação e autorização de usuários.
    * **WeatherKit** [3]: Para integração de dados meteorológicos (ou uma alternativa de API de clima).
    * **NextAuth.js** [4]: Solução de autenticação completa para Next.js, configurada para usar JWT.
    * **WebSocket** [5]: Para comunicação em tempo real com o backend.
    * **Tailwind CSS** [11]: Framework CSS utilitário para construção rápida de interfaces.
    * **Shadcn/ui** [12]: Componentes de UI construídos com Radix UI e Tailwind CSS, para interfaces elegantes e acessíveis.
    * **React** [16]: Biblioteca JavaScript para construção de interfaces de usuário baseadas em componentes.
    * **React Native** [17]: Framework para desenvolvimento de aplicativos móveis nativos (iOS e Android) utilizando React.
    * **Expo** [18]: Plataforma que simplifica o desenvolvimento, testes e distribuição de aplicativos React Native.

* **Funcionalidades Esperadas:**
    * Autenticação e autorização de usuários.
    * Dashboard de visualização do status de todos os pivôs.
    * Controle individual de pivôs (ligar/desligar, definir direção, modo de irrigação).
    * Ao ligar o pivô, deve ser possível definir se a irrigação ocorrerá com água ou apenas movimentação.
    * Se for com água, deve ser possível definir o percentual do percentímetro (valor inteiro de 0 a 100) para a lâmina de água a ser aplicada, considerando o `bladeAt100` cadastrado para o pivô.
    * Visualização em tempo real da movimentação e status de irrigação de um pivô específico.
    * Acesso ao histórico de movimentação e irrigação.
    * **Exibição de previsão do tempo em cards visuais** com base na localização (latitude e longitude) do pivô/fazenda, utilizando dados do WeatherKit ou API similar.

### 3.2. Backend

O backend será responsável pela lógica de negócios, gerenciamento de usuários, comunicação com dispositivos IoT, persistência de dados e fornecimento de dados em tempo real para o frontend.

* **Tecnologias:**
    * **NestJS** [6]: Framework Node.js progressivo para construir aplicações eficientes e escaláveis do lado do servidor.
    * **AWS IoT Core** [7]: Serviço gerenciado de nuvem que permite que dispositivos conectados interagem com aplicativos em nuvem e outros dispositivos de forma segura.
    * **WebSocket** [5]: Para comunicação em tempo real com o frontend.
    * **Prisma** [8]: ORM de próxima geração para Node.js e TypeScript.
    * **PostgreSQL** [9]: Banco de dados relacional robusto e de código aberto.
    * **Redis** [13]: Banco de dados em memória, utilizado como fila para processamento assíncrono de pacotes MQTT.

* **Funcionalidades Esperadas:**
    * Gerenciamento de usuários com **Roles de acesso**.
    * Autenticação e autorização de rotas baseada em JWT e Roles.
    * Recebimento de mensagens MQTT dos pivôs via AWS IoT.
    * **Processamento assíncrono de pacotes MQTT via fila (Redis)**.
    * Persistência de dados de status e histórico dos pivôs.
    * Disponibilização de dados em tempo real para o frontend via WebSocket.
    * API RESTful para gerenciamento de pivôs e usuários.

### 3.3. Comunicação

* **MQTT (Message Queuing Telemetry Transport)** [10]: Protocolo de mensagens leve para dispositivos IoT, utilizado para a comunicação entre os pivôs e o AWS IoT Core.
* **WebSocket** [5]: Protocolo de comunicação bidirecional full-duplex sobre uma única conexão TCP, utilizado para a comunicação em tempo real entre o backend e o frontend.

## 4. Requisitos Técnicos Detalhados

### 4.1. Autenticação e Autorização (Backend)

* O sistema deve implementar um mecanismo de autenticação baseado em JWT.
* Os usuários devem ter **Roles de acesso** definidas (ex: `admin`, `operador`, `visualizador`).
* As rotas do backend devem ser protegidas, e o acesso deve ser validado com base na Role do usuário e no JWT fornecido.

### 4.2. Modelagem de Dados (PostgreSQL com Prisma)

Serão necessárias, no mínimo, as seguintes tabelas para gerenciar fazendas, pivôs e registrar o histórico de movimentação e irrigação:

#### 4.2.1. Tabela `Farm`

Esta tabela registrará as informações das fazendas onde os pivôs estão localizados.

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Identificador único da fazenda. | `f1a2b3c4-d5e6...` |
| `name` | `String` | Nome da fazenda. | `Fazenda Esperança` |
| `latitude` | `Float` | Latitude da localização da fazenda. | `-23.5505` |
| `longitude` | `Float` | Longitude da localização da fazenda. | `-46.6333` |

#### 4.2.2. Tabela `Pivot`

Esta tabela registrará as informações de cada pivô de irrigação. Uma fazenda pode ter múltiplos pivôs (relação 1:N com `Farm`). Cada pivô pode ter múltiplos estados (`State`) e cada estado múltiplos ciclos (`Cycles`), formando uma hierarquia 1:N:N (Farm:Pivot:State:Cycles).

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Identificador único do pivô. | `p1v2o3t4-a5b6...` |
| `farmId` | `UUID` | Chave estrangeira para a fazenda associada. | `f1a2b3c4-d5e6...` |
| `name` | `String` | Nome ou identificador do pivô. | `Pivô 1` |
| `latitude` | `Float` | Latitude da localização do pivô. | `-23.5510` |
| `longitude` | `Float` | Longitude da localização do pivô. | `-46.6340` |
| `status` | `JSON` | Último pacote de status recebido do pivô (JSON). | `{...}` |
| `bladeAt100`| `Float` | Lâmina de água irrigada com percentímetro a 100% (em mm). | `10.0` |

#### 4.2.3. Tabela `State`

Esta tabela registrará os estados principais de operação do pivô.

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Identificador único do estado. | `a1b2c3d4-e5f6...` |
| `pivotId` | `UUID` | Chave estrangeira para o pivô associado (`Pivot`). | `p1v2o3t4-a5b6...` |
| `timestamp` | `DateTime` | Momento em que o estado foi registrado. | `2023-10-27T10:00:00Z` |
| `isOn` | `Boolean` | Indica se o pivô estava ligado (`true`) ou desligado (`false`). | `true` |
| `direction` | `String` | Direção de movimentação do pivô (ex: `clockwise`, `counter-clockwise`). | `clockwise` |
| `isIrrigating`| `Boolean` | Indica se o pivô estava irrigando (`true`) ou apenas movimentando (`false`). | `true` |

#### 4.2.4. Tabela `Cycles`

Esta tabela registrará os detalhes da movimentação e irrigação, relacionada à tabela `State` (1 `State` para N `Cycles`).

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Identificador único do ciclo. | `1a2b3c4d-5e6f...` |
| `stateId` | `UUID` | Chave estrangeira para o estado (`State`) associado. | `a1b2c3d4-e5f6...` |
| `timestamp` | `DateTime` | Momento em que o dado do ciclo foi registrado. | `2023-10-27T10:00:05Z` |
| `angle` | `Float` | Ângulo atual do pivô (em graus). | `45.5` |
| `percentimeter`| `Float` | Leitura do percentímetro (ex: 0-100%). | `75.2` |

### 4.3. Integração com Previsão do Tempo (WeatherKit)

* O sistema deve armazenar a **latitude e longitude** tanto para a fazenda quanto para cada pivô individualmente.
* O frontend deve consumir uma API (diretamente ou via backend) que utilize o **WeatherKit** (ou uma alternativa de API de clima) para obter a previsão do tempo com base nas coordenadas geográficas do pivô ou da fazenda.
* A previsão do tempo deve ser exibida em um **card visual** no frontend, apresentando informações relevantes como temperatura, condições climáticas, umidade, etc.

### 4.4. Processamento de Pacotes MQTT e Fila (Redis)

* O backend deve se inscrever em tópicos MQTT para receber dados dos pivôs via AWS IoT.
* Os pacotes MQTT recebidos devem ser enfileirados em uma **fila Redis** para processamento assíncrono, garantindo a resiliência e escalabilidade do sistema.
* Um worker ou serviço dedicado deve consumir esses pacotes da fila Redis.
* O formato dos pacotes MQTT e os canais específicos serão fornecidos em um documento complementar.
* Os dados processados devem ser armazenados nas tabelas `State` e `Cycles`.
* **Lógica de Criação e Atualização de `State` e `Cycles`**:
    * A cada evento de `ligar` o pivô (conforme definido no documento de pacotes), um **novo registro na tabela `State`** deve ser criado, marcando o início de um novo período de operação.
    * Enquanto o pivô estiver ligado, cada atualização de pacote recebida deve gerar um **novo registro na tabela `Cycles`**, referenciando o `State` ativo. O registro `State` correspondente deve ser atualizado apenas com as informações necessárias (ex: direção, irrigando).
    * Quando o pivô for `desligado` (conforme definido no documento de pacotes), o registro `State` ativo deve ser finalizado, atualizando seu status para desligado.
    * **Atualização do Status do Pivô**: O campo `status` na tabela `Pivot` deve ser atualizado continuamente com o conteúdo do pacote MQTT mais recente recebido, refletindo o estado atual do pivô para o frontend.
    * **Documentação de formatos de pacotes:** [14] anexado no link ao lado contem a documenção extra de pacotes.

### 4.5. Comunicação em Tempo Real (WebSocket)

* O backend deve enviar atualizações em tempo real para o frontend sempre que houver novos dados de movimentação ou estado de um pivô.
* O frontend deve consumir essas atualizações para exibir o status atualizado dos pivôs sem a necessidade de recarregar a página.

## 5. Requisitos de Infraestrutura e DevOps (Bônus)

Esta seção descreve requisitos adicionais que não são estritamente obrigatórios para o funcionamento da aplicação, mas que agregarão valor significativo ao projeto e **contarão como pontos adicionais** na avaliação.

### 5.1. Dockerização Completa

* **Containerização**: Tanto a aplicação Frontend (Next.js) quanto a Backend (NestJS) devem ser dockerizadas.
* **Docker Compose**: Deve ser fornecido um arquivo `docker compose.yml` que orquestre a subida de todo o ambiente de desenvolvimento, incluindo:
    * Serviço do Backend.
    * Serviço do Frontend.
    * Banco de Dados (PostgreSQL).
    * Fila e Cache (Redis).

### 5.2. Proxy Reverso com Traefik

* A arquitetura deve incluir o **Traefik** [15] configurado como Proxy Reverso para gerenciar o roteamento das requisições.
* **Roteamento por Host/Path**: O Traefik deve ser configurado para encaminhar o tráfego adequadamente.
    * Exemplo: Requisições para `api.localhost` (ou domínio similar) devem ser direcionadas ao container do Backend.
    * Exemplo: Requisições para `localhost` devem ser direcionadas ao container do Frontend.
* **Dashboard**: A configuração deve permitir o acesso (opcionalmente protegido) ao dashboard de monitoramento do próprio Traefik.

## 6. Referências

[1]: [Next.js Documentation](https://nextjs.org/docs)
[2]: [JWT - JSON Web Tokens](https://jwt.io/)
[3]: [WeatherKit Documentation](https://developer.apple.com/weatherkit/)
[4]: [NextAuth.js Documentation](https://next-auth.js.org/)
[5]: [MDN Web Docs - WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[6]: [NestJS Documentation](https://docs.nestjs.com/)
[7]: [AWS IoT Core Documentation](https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html)
[8]: [Prisma Documentation](https://www.prisma.io/docs)
[9]: [PostgreSQL Documentation](https://www.postgresql.org/docs/)
[10]: [MQTT.org - About MQTT](https://mqtt.org/faq/)
[11]: [Tailwind CSS Documentation](https://tailwindcss.com/docs)
[12]: [shadcn/ui Documentation](https://ui.shadcn.com/docs)
[13]: [Redis Documentation](https://redis.io/docs/)
[14]: [Documentação de Pacotes](https://localhost:3000/)
[15]: [Traefik Documentation](https://doc.traefik.io/traefik/)
[16]: [React](https://pt-br.legacy.reactjs.org/docs/getting-started.html)
[17]: [ReactNative](https://reactnative.dev/docs/getting-started)
[18]: [Expo](https://docs.expo.dev/)
