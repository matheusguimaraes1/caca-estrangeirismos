/* =====================================================================
   TEXTOS DO JOGO
   - Coloque as palavras/expressões ESTRANGEIRAS entre [colchetes].
   - Expressões com espaço (ex.: [QR code]) viram um único clique.
   - Para adicionar um texto novo, copie um bloco { titulo, corpo }.
   ===================================================================== */
const TEXTOS = [
  {
    titulo: 'Um dia conectado',
    corpo: 'Hoje acordei, peguei meu [smartphone] e abri o [Instagram] para conferir as novidades. Vi que um [influencer] tinha publicado um [story] mostrando uma viagem incrível. Depois, entrei no [WhatsApp] para responder às mensagens dos meus amigos e publiquei uma [selfie] no meu [feed]. Durante o café da manhã, assisti a um vídeo no [YouTube] e ouvi um [podcast] sobre esportes. Antes de sair de casa, fiz o [download] de um aplicativo novo para editar minhas fotos. No caminho para a escola, conectei meus fones [Bluetooth] e escutei minha [playlist] favorita. Quando cheguei, um amigo me mostrou um [meme] engraçado que estava viralizando na [internet].'
  },
  {
    titulo: 'Passeio no shopping',
    corpo: 'No sábado, combinei com meus amigos de ir ao [shopping] para passar a tarde. Antes de sair, mandei uma mensagem pelo [WhatsApp] para confirmar o horário. Quando chegamos, fomos à praça de alimentação e pedimos hambúrguer, batata frita e [milk-shake]. Depois, entramos em uma loja para olhar algumas roupas e encontramos uma promoção de [jeans]. Um dos meus amigos experimentou um [look] novo e pediu nossa opinião. Mais tarde, pedimos um [delivery] de sobremesa para dividir entre todos. Antes de ir embora, tiramos uma [selfie], postamos a foto no [Instagram] e marcamos nossa localização. Foi um passeio divertido, cheio de conversas, compras e boas lembranças.'
  },
  {
    titulo: 'Uma tarde de games',
    corpo: 'Quando cheguei da escola, liguei meu [notebook] para jogar [on-line] com meus amigos. Primeiro, fiz o [login] na minha conta e conferi se havia alguma atualização disponível. Depois, entrei no [game] e convidei meus colegas para formar um time. Durante a partida, usamos o [chat] para conversar e combinar nossas estratégias. Meu amigo conseguiu um [upgrade] em seu personagem e ficou muito mais forte. Enquanto jogávamos, deixei uma [live] de um [streamer] aberta no segundo monitor. No final, gravamos um clipe com os melhores momentos e compartilhamos o [link] no nosso grupo. Antes de desligar o computador, fiz o [backup] dos meus arquivos e atualizei meu perfil.'
  },
  {
    titulo: 'Preparando uma festa',
    corpo: 'Minha turma decidiu organizar uma festa para comemorar o fim das aulas. Criamos um grupo no [WhatsApp] para discutir os detalhes e fizemos um [brainstorming] com várias ideias. Uma colega ficou responsável pelo [design] do convite, enquanto outro aluno preparou uma [playlist] com músicas [pop]. Também organizamos um [checklist] para não esquecer nenhum item importante. No dia da festa, contratamos um [DJ], montamos um espaço para tirar fotos e colocamos um [banner] na entrada. Alguns alunos fizeram um [feedback] sobre a organização e sugeriram melhorias para os próximos eventos. No final, todos ajudaram a guardar os materiais e publicaram fotos nos [stories].'
  },
  {
    titulo: 'Compras pela internet',
    corpo: 'Na semana passada, decidi comprar um tênis pela [internet]. Abri um [site] de compras e usei o filtro para encontrar o modelo que queria. Antes de finalizar o pedido, conferi o [feedback] dos clientes e comparei os preços de diferentes lojas. Encontrei uma oferta com frete grátis e aproveitei o desconto. Depois, fiz o [login] na minha conta, preenchi o cadastro e finalizei o pagamento. Recebi um [e-mail] com a confirmação da compra e um [link] para acompanhar o [status] da entrega. Alguns dias depois, o entregador chegou com o pacote. Gravei um [unboxing] para mostrar o produto aos meus amigos e publiquei o vídeo no meu perfil.'
  },
  {
    titulo: 'Um projeto escolar',
    corpo: 'Para preparar um trabalho escolar, nosso grupo decidiu criar uma apresentação sobre tecnologia. Marcamos uma reunião [on-line] para dividir as tarefas e organizamos nossas ideias em um documento compartilhado. Uma pessoa ficou responsável pelo [layout] dos [slides], enquanto outra pesquisou informações em [sites] confiáveis. Depois, usamos um aplicativo para editar as imagens e criamos um [QR code] para facilitar o acesso às fontes. Durante o ensaio, recebemos [feedback] dos colegas e fizemos algumas alterações no conteúdo. No dia da apresentação, conectamos o [notebook] ao projetor e mostramos nosso trabalho para a turma. No final, o professor elogiou nosso desempenho e sugeriu que publicássemos o projeto em um [blog] da escola.'
  }
];

/* Significado de cada palavra estrangeira (aparece no resumo de cada texto).
   A chave é a palavra em minúsculas, igual está no texto. */
const GLOSSARIO = {
  'smartphone': 'celular inteligente',
  'instagram': 'rede social de fotos e vídeos (marca)',
  'influencer': 'influenciador(a) digital',
  'story': 'publicação que some em 24 horas',
  'stories': 'publicações que somem em 24 horas',
  'whatsapp': 'aplicativo de mensagens (marca)',
  'selfie': 'foto de si mesmo, autorretrato',
  'feed': 'mural / linha do tempo de publicações',
  'youtube': 'plataforma de vídeos (marca)',
  'podcast': 'programa de áudio na internet',
  'download': 'baixar um arquivo',
  'bluetooth': 'conexão sem fio entre aparelhos',
  'playlist': 'lista de músicas',
  'meme': 'imagem ou vídeo engraçado que se espalha na rede',
  'internet': 'rede mundial de computadores',
  'shopping': 'centro comercial',
  'milk-shake': 'batida de leite com sorvete',
  'jeans': 'tecido de brim (calça de brim)',
  'look': 'visual, conjunto de roupas',
  'delivery': 'entrega em domicílio',
  'notebook': 'computador portátil',
  'on-line': 'conectado à internet',
  'login': 'entrada na conta, acesso',
  'game': 'jogo eletrônico',
  'chat': 'bate-papo',
  'upgrade': 'melhoria, atualização',
  'live': 'transmissão ao vivo',
  'streamer': 'pessoa que transmite ao vivo',
  'link': 'endereço / ligação para uma página',
  'backup': 'cópia de segurança',
  'brainstorming': 'tempestade de ideias',
  'design': 'projeto visual, desenho',
  'pop': 'estilo de música popular',
  'checklist': 'lista de verificação',
  'dj': 'pessoa que toca as músicas na festa',
  'banner': 'faixa, cartaz',
  'feedback': 'retorno, opinião, avaliação',
  'site': 'página na internet (sítio)',
  'sites': 'páginas na internet (sítios)',
  'e-mail': 'correio eletrônico',
  'status': 'situação, estado (do latim)',
  'unboxing': 'vídeo abrindo a embalagem de um produto',
  'layout': 'disposição, diagramação',
  'slides': 'telas de uma apresentação',
  'qr code': 'código de resposta rápida',
  'blog': 'diário / página pessoal na internet'
};

/* "Pegadinhas": palavras que vieram de outras línguas, mas já foram
   aportuguesadas. Clicar nelas conta como ERRO, mas o jogo explica o porquê. */
const PEGADINHAS = {
  'hambúrguer': 'Veio do inglês "hamburger", mas já foi aportuguesado. Repare no acento!',
  'time': 'Veio do inglês "team", mas já é palavra do português (está no dicionário).',
  'clipe': 'Veio do inglês "clip", mas já foi aportuguesado.',
  'tênis': 'Veio do inglês "tennis", mas já foi aportuguesado. Repare no acento!',
  'frete': 'Veio do francês "fret", mas já é palavra do português.',
  'vídeo': 'Vem do latim e já é palavra do português.',
  'aplicativo': 'É português! Em inglês seria "app".',
  'postamos': 'Verbo já adaptado ao português (postar), com conjugação nossa.',
  'viralizando': 'Verbo criado no português a partir de "viral".',
  'item': 'Vem do latim, mas já é palavra do português.',
  'monitor': 'Vem do latim e já é palavra do português.',
  'grátis': 'Vem do latim, mas já é palavra do português.',
  'computador': 'É português! Em inglês seria "computer".',
  'projetor': 'É português! Em inglês seria "projector".'
};
