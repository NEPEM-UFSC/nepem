---
toc: true
title: Organizando o currículo Lattes
subtitle: ''
summary: 'Neste post, apresento uma planilha baseada na linguagem VBA-Excel para gerenciamento e organização do currículo lattes.'
author: Tiago Olivoto
date: '2022-01-22'
lastmod: '2022-03-18'
url_source: https://github.com/TiagoOlivoto/lattes
categories:
  - metan
tags:
  - Lattes
  - Currículo
  - Organização
  - Excel
  - VBA
image:
  placement: 2
  caption: 'Image by David Schwarzenberg from Pixabay '
  preview_only: no
featured: no
math: true
---

<script src="https://kit.fontawesome.com/1f72d6921a.js" crossorigin="anonymous"></script>




No primeiro post de 2022, apresento uma planilha confeccionada em VBA-Excel, para gerenciamento e organização do[ Curriculo Lattes](https://lattes.cnpq.br/). A Plataforma Lattes é um sistema de currículos virtual criado e mantido pelo Conselho Nacional de Desenvolvimento Científico e Tecnológico, pelo qual integra as bases de dados curriculares, grupos de pesquisa e instituições em um único sistema de informações, das áreas de Ciência e Tecnologia, atuando no Brasil.

Um usuário com Curriculo Lattes mantém sua base digital atualizada na plataforma, mas os comprovantes para documentação do currículo (arquivos .pdf ou imagem, etc.), são muitas vezes salvos em pastas sem nenhum tipo de organização, dificultando uma futura compilação. Tendo passado por três concursos públicos, onde necessitava organizar os documentos do Lattes para posterior comprovação, senti a necessidade de uma ferramenta específica para isso. Como já tinha alguma experiência com a linguagem VBA (*Visual Basic for Applications*) no Microsoft Excel (MS-Excel), resolvi desenvolver a aplicação.


A planilha foi desenvolvida utilizando VBA no Microsoft MS-Excel. Embora seja necessária uma licença comercial para o MS-Excel, ele é o principal editor de planilhas utilizado pela comunidade acadêmica e científica. As aplicações feitas por meio de macros e `userform` não requerem instalação, apenas uma cópia do MS-Excel 2007 ou superior com a opção macro habilitada.



# <i class="fas fa-database"></i> Download

A planilha, bem como as orientações para uso são encontradas neste [repositório github](https://github.com/TiagoOlivoto/lattes). Para realizar o download, basta clicar no botão abaixo. Caso o download não inicie automaticamente, utilize o segundo botão direito do mouse, escolhendo a opção *salvar link como...* 


<a href="https://github.com/TiagoOlivoto/lattes/archive/refs/heads/master.zip">
<button class="btn btn-success"><i class="fa fa-save"></i> Download da planilha</button>
</a>
<br>
<br>

Um arquivo .zip chamado `"lattes-master.zip"` será baixado. Sugiro ao usuário descompactar este arquivo e renomear a pasta para `"lattes"`. Dentro desta pasta o usuário encontrará a planilha bem como um arquivo .txt com instruções. Sugiro salvar a pasta em seu computador, em uma unidade onde serão armazenados os arquivos (ex. `"E:/Documents/lattes"`).


# Apresentação

Ao abrir a planilha, o usuário irá encontrar a seguinte tela 

![Tela inicial](images/home.png)

A barra de menus, contém os seguintes menus:

* Cadastros: onde são realizados todos os cadastros
* Consultas: onde é possível consultar os dados cadastrados
* Relatórios: onde é possível visualizar relatórios em tabelas dinâmicas dos dados cadastrados
* Pastas: onde é possível abrir as pastas contendo os documentos
* Configurações: onde são realizadas algumas configurações para a planilha funcionar adequadamente, como definir trilha de dados, etc.
* Ajuda: onde contém informações e links úteis.

# Orientações de uso

## Trilha de dados

O primeiro passo para utilização da planilha é definir a trilha de dados, ou seja, o local onde as informações serão salvas. Para isso, utilize o menu `"Configurações > Trilha de dados"`. Escolha a pasta e clique em "ok". Em meu exemplo, a trilha de dados foi definida para a pasta "Documentos".

![Trilha de dados](images/trilha.png)


##  Estrutura do currículo

O segundo passo é criar a estrutura do currículo. Para isso, utilize o menu `"Configurações > Inserir > Nova estrutura"`. Uma pasta chamada `"lattes"` será criada na trilha de dados informada. Caso a pasta baixada e renomeada para `"lattes"` tenha sido salva na mesma unidade da trilha de dados, uma mensagem informará o usuário de que a estrutura será criada dentro desta pasta. Com este processo, subpastas contendo as opções para os registros mais comuns (ex. artigos publicados em periódicos, resumos, etc..) serão também criadas. Posteriormente, o usuário conseguirá incluir uma nova pasta utilizando o menu `"Configurações > Inserir > Nova pasta"`

![Inserir estrutura](images/estrutura.png)


Após a criação da estrutura, as seguintes pastas poderão ser encontradas
![Pastas criadas](images/pastas_criadas.png)



##  Cadastro dos documentos

Para realizar o cadastro de um documento, utilize o menu `"Cadastros"`. Nele é possível escolher entre os tipos de documentos. Em todos os cadastros, será necessário escolher um arquivo (certificado, artigo, etc...) qual será armazenado na pasta automaticamente.

No exemplo a seguir, incluí o cadastro de um artigo publicado. O arquivo `"artigo_mtsi_milho.pdf"` foi escolhido e as informações preenchidas. Ao clicar em `"salvar"`, um prefixo no formato `"001, 002... 00n"` é incluído no nome do arquivo e o arquivo é salvo. Esta identificação é única e dependerá do número de registros existentes em cada planilha (`n`). Neste caso, como era o primeiro registro, o prefixo `"001"` foi incluído no nome do arquivo.

![Cadastro de registros](images/cadastros.png)

## Consulta de documentos

No menu `"Consulta"` é possível realizar a consulta dos dados inseridos. No seguinte exemplo (`"Consultas > produções"`) é visualizado o cadastro realizado anteriormente. 

![Consulta](images/consulta.png)


Merecem destaque as colunas `"File"` e `"Folder"`. Estas colunas contém um link para acesso ao arquivo e a pasta do arquivo, respectivamente. Então, para abrir o arquivo, basta clicar no link correspondente. 

![Arquivo](images/file.png)


## Remover registros 
Para remover um registro, basta selecionar qualquer célula da linha que se deseja remover e clicar no botão `"Remove"`. Uma confirmação será necessária. O registro bem como o arquivo associado a ele (salvo na hora do cadastro) serão removidos. Esta ação não pode ser desfeita.

![remover registros](images/remover.png)

## Relatório de documentos
No menu `"Relatórios"` é possível realizar um simples relatório das informações em formato de tabela dinâmica. No exemplo a seguir (`"Relatório > produções"`), o cadastro realizado anteriormente aparece como a única informação.

![Relatório](images/relatorios.png)


**Bom uso!**




