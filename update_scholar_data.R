# ==============================================================================
# update_scholar_data.R
#
# Descrição:
# Script para buscar dados do Google Scholar (perfil e artigos), GitHub Repos
# e ORCID, gerando um JSON unificado para o site NEPEM/UFSC.
#
# Autor: Weverton Costa (Adaptado para R/Scholar-Only por Gemini)
# Versão: 9.0.0 (R / httr2 / Scholar-Only)
# ==============================================================================

# Instale os pacotes necessários se necessário:
# install.packages(c("httr2", "jsonlite", "logger", "dplyr", "purrr", "stringr", "fs", "lubridate", "glue"))

library(httr2)
library(jsonlite)
library(logger)
library(dplyr)
library(purrr)
library(stringr)
library(fs)
library(lubridate)
library(glue)

log_info("Iniciando a atualização do arquivo de fallback do Scholar em R...")

# ==============================================================================
# CARREGAMENTO DE CONFIGURAÇÕES
# ==============================================================================
load_keys <- function(keys_file = "keys.json") {
  if (!file_exists(keys_file)) {
    log_error("ERRO CRÍTICO: O arquivo de chaves '{keys_file}' não foi encontrado.")
    stop("Arquivo de chaves não encontrado.")
  }
  tryCatch({
    keys <- read_json(keys_file)
    return(keys)
  }, error = function(e) {
    log_error("ERRO CRÍTICO: O arquivo '{keys_file}' contém um JSON inválido: {e$message}")
    stop("JSON inválido.")
  })
}

keys <- load_keys()

# Atribui as variáveis de configuração
GITHUB_USERNAME <- keys$github_username
GITHUB_TOKEN <- keys$github_token
GITHUB_USERNAME_NEPEM <- keys$github_username_nepem
GITHUB_TOKEN_NEPEM <- keys$github_token_nepem
ORCID_ID <- keys$orcid_id
SCHOLAR_AUTHOR_ID <- keys$scholar_author_id
SERPAPI_KEYS <- keys$serpapi_api_key

# Determina os caminhos corretos dinamicamente de acordo com o diretório atual de execução
detect_paths <- function() {
  if (dir_exists("site/data")) {
    return(list(
      main = "site/data/fallback-data.json",
      temp = "site/data/fallback-data-temp.json"
    ))
  } else if (dir_exists("data")) {
    return(list(
      main = "data/fallback-data.json",
      temp = "data/fallback-data-temp.json"
    ))
  } else {
    dir_create("site/data")
    return(list(
      main = "site/data/fallback-data.json",
      temp = "site/data/fallback-data-temp.json"
    ))
  }
}

paths <- detect_paths()
MAIN_FILENAME <- paths$main
TEMP_FILENAME <- paths$temp

# Validação das chaves essenciais
if (is.null(SCHOLAR_AUTHOR_ID) || length(SERPAPI_KEYS) == 0) {
  log_error("ERRO CRÍTICO: Verifique 'scholar_author_id' e pelo menos uma 'serpapi_api_key' válida no 'keys.json'.")
  stop("Configuração essencial ausente.")
}

# ==============================================================================
# FUNÇÕES AUXILIARES
# ==============================================================================
normalize_title <- function(title) {
  if (is.null(title) || title == "") return("")
  clean_title <- str_remove_all(title, "<.*?>")
  clean_title <- iconv(clean_title, from = "UTF-8", to = "ASCII//TRANSLIT")
  clean_title <- str_remove_all(clean_title, "[^\\w\\s]")
  clean_title <- str_to_lower(clean_title)
  return(str_trim(clean_title))
}

load_json_data <- function(filepath) {
  if (!file_exists(filepath)) {
    log_warn("Arquivo antigo '{filepath}' não encontrado para comparação.")
    return(NULL)
  }
  tryCatch({
    read_json(filepath)
  }, error = function(e) {
    log_error("Erro ao decodificar o arquivo JSON '{filepath}': {e$message}")
    return(NULL)
  })
}

# ==============================================================================
# FUNÇÕES DE BUSCA DE DADOS (com httr2)
# ==============================================================================

fetch_github_repos <- function(username, token = NULL) {
  if (is.null(username) || username == "") return(list())
  log_info("Buscando repositórios do GitHub para '{username}'...")
  api_url <- glue("https://api.github.com/users/{username}/repos?sort=pushed&per_page=100")
  req <- request(api_url) %>%
    req_headers("Accept" = "application/vnd.github.v3+json")
  if (!is.null(token) && token != "") {
    req <- req %>% req_headers("Authorization" = glue("token {token}"))
  }
  tryCatch({
    resp <- req %>% req_perform()
    repos <- resp %>% resp_body_json()
    
    formatted_repos <- map(repos, ~{
      homepage_url <- .x$homepage
      if (is.null(homepage_url) || homepage_url == "") {
        if (isTRUE(.x$has_pages)) {
          homepage_url <- glue("https://{username}.github.io/{.x$name}/")
        } else {
          homepage_url <- "null"
        }
      }
      list(
        name = .x$name %||% "null",
        html_url = .x$html_url %||% "null",
        homepage = homepage_url,
        description = .x$description %||% "null",
        language = .x$language %||% "null",
        stargazers_count = .x$stargazers_count %||% 0,
        forks_count = .x$forks_count %||% 0,
        updated_at = .x$updated_at %||% "null",
        topics = .x$topics %||% list()
      )
    })
    log_info("✓ {length(formatted_repos)} repositórios do GitHub encontrados para {username}.")
    return(formatted_repos)
    
  }, error = function(e) {
    log_error("Erro ao buscar repositórios do GitHub para {username}: {e$message}")
    return(list())
  })
}

# --- ORCID ---
fetch_orcid_works <- function(orcid_id) {
  if (is.null(orcid_id) || orcid_id == "") return(list())
  log_info("Buscando publicações do ORCID '{orcid_id}'...")
  api_url <- glue("https://pub.orcid.org/v3.0/{orcid_id}/works")
  
  req <- request(api_url) %>%
    req_headers("Accept" = "application/json")
  tryCatch({
    resp <- req %>% req_perform()
    data <- resp %>% resp_body_json()
    groups <- data$group %||% list()
    data_orcid <- 
      map(groups, function(x){
        title <- x[["work-summary"]][[1]][["title"]][["title"]][["value"]]
        doi <- NULL
        doi_link <- NULL
        link <- x[["work-summary"]][[1]][["url"]][["value"]] %||% NULL
        year <- x[["work-summary"]][[1]][["publication-date"]][["year"]][["value"]] %||% NULL
        journal_title <- x[["work-summary"]][[1]][["journal-title"]][["value"]] %||% NULL
        ext_ids <- x$"external-ids"$"external-id" %||% list()
        
        if (length(ext_ids) > 0) {
          ext_type <- ext_ids[[1]][["external-id-type"]]
          if (!is.null(ext_type) && ext_type == "doi") {
            doi <- ext_ids[[1]][["external-id-value"]]
            doi_link <- glue("https://doi.org/{doi}")
          } else {
            doi <- ext_ids[[1]][["external-id-value"]]
            doi_link <- x[["work-summary"]][[1]][["url"]][["value"]]
          }
        }
        
        list(
          title = title,
          doi = doi,
          doiLink = doi_link,
          year = year,
          journalTitle = journal_title,
          link = link
        )
      }) |> 
      compact() 
    log_info("✓ {length(data_orcid)} publicações encontradas no ORCID.")
    return(data_orcid)
    
  }, error = function(e) {
    log_error("Erro ao buscar dados do ORCID: {e$message}")
    return(list())
  })
}

# --- Google Scholar Profile ---
fetch_scholar_profile <- function(author_id, api_key) {
  log_info("Buscando perfil do Google Scholar para '{author_id}'...")
  req <- request("https://serpapi.com/search.json") %>%
    req_url_query(
      engine = "google_scholar_author",
      author_id = author_id,
      api_key = api_key,
      hl = "pt-br"
    )
  
  tryCatch({
    resp <- req %>% req_perform()
    data <- resp %>% resp_body_json()
    
    if (!is.null(data$error)) stop(data$error)
    
    raw_table <- data$cited_by$table %||% list()
    
    # Padroniza a tabela
    standardized_table <- map(raw_table, ~{
      if (!is.null(.x$"citações")) {
        .x$"citações"$"since_2020" <- .x$"citações"$"desde_2020"
        .x$"citações"$"desde_2020" <- NULL
        list(citations = .x$"citações")
      } else if (!is.null(.x$"Índice_h")) {
        .x$"Índice_h"$"since_2020" <- .x$"Índice_h"$"desde_2020"
        .x$"Índice_h"$"desde_2020" <- NULL
        list(h_index = .x$"Índice_h")
      } else if (!is.null(.x$"Índice_i10")) {
        .x$"Índice_i10"$"since_2020" <- .x$"Índice_i10"$"desde_2020"
        .x$"Índice_i10"$"desde_2020" <- NULL
        list(i10_index = .x$"Índice_i10")
      } else {
        .x
      }
    })
    
    # Padroniza o gráfico
    api_graph <- data$cited_by$graph %||% list()
    api_graph_map <- setNames(map_int(api_graph, "citations"), map_int(api_graph, "year"))
    
    min_api_year <- if(length(api_graph_map) > 0) min(as.integer(names(api_graph_map))) else year(now())
    
    # Anos que faltam desde 2017
    years_to_pad <- (2017:year(now()))
    if (min_api_year > 2017) {
      years_to_pad <- 2017:min_api_year
    }
    
    current_year <- year(now())
    api_years <- as.integer(names(api_graph_map))
    all_years <- unique(c(years_to_pad, api_years))
    
    final_graph_data <- map(all_years, ~{
      list(
        year = .x,
        citations = api_graph_map[as.character(.x)] %||% 0
      )
    }) %>% 
      keep(~ .x$year <= current_year) %>% 
      .[order(map_int(., "year"))]
    
    profile_data <- list(table = standardized_table, graph = final_graph_data)
    log_info("✓ Perfil do Google Scholar encontrado e padronizado.")
    return(profile_data)
    
  }, error = function(e) {
    log_error("Erro ao buscar perfil do Scholar: {e$message}")
    return(NULL)
  })
}

# --- Google Scholar Articles ---
fetch_all_scholar_articles <- function(author_id, api_key) {
  log_info("Buscando publicações do Google Scholar...")
  all_articles <- list()
  start_index <- 0
  while (TRUE) {
    log_info("  - Buscando página de resultados (iniciando em {start_index})...")
    req <- request("https://serpapi.com/search.json") %>%
      req_url_query(
        engine = "google_scholar_author",
        author_id = author_id,
        api_key = api_key,
        hl = "pt-br",
        start = start_index,
        num = 100
      )
    
    tryCatch({
      resp <- req %>% req_perform()
      data <- resp %>% resp_body_json()
      
      if (!is.null(data$error)) stop(data$error)
      
      articles_on_page <- data$articles %||% list()
      if (length(articles_on_page) == 0) break
      
      all_articles <- c(all_articles, articles_on_page)
      start_index <- start_index + length(articles_on_page)
      
      if (length(articles_on_page) < 100) break
      
    }, error = function(e) {
      log_error("Erro ao buscar página de publicações do Scholar: {e$message}")
      return(all_articles)
    })
  }
  
  log_info("✓ Total de {length(all_articles)} publicações do Scholar encontradas.")
  return(all_articles)
}

# ==============================================================================
# FUNÇÃO DE COMPARAÇÃO E GERAÇÃO DE RELATÓRIO
# ==============================================================================
extract_metrics <- function(data) {
  m <- list(citations = 0, h_index = 0, i10_index = 0)
  table <- data$scholarData$profile$cited_by$table %||% list()
  for (item in table) {
    if (!is.null(item$citations)) m$citations <- item$citations$all %||% 0
    if (!is.null(item$h_index)) m$h_index <- item$h_index$all %||% 0
    if (!is.null(item$i10_index)) m$i10_index <- item$i10_index$all %||% 0
  }
  return(m)
}

analyze_changes <- function(old_data, new_data) {
  if (is.null(old_data)) {
    return(list(
      report_lines = c("  [!] Arquivo de dados antigo não encontrado. Criando um novo."),
      modification_notes = c("initial data generation")
    ))
  }
  
  report_lines <- c()
  modification_notes <- c()
  
  # Comparação de Repositórios
  old_repos_list <- old_data$githubRepos %||% list()
  new_repos_list <- new_data$githubRepos %||% list()
  
  old_repos <- map_chr(old_repos_list, ~.x$name %||% "")
  new_repos <- map_chr(new_repos_list, ~.x$name %||% "")
  
  added_repos <- setdiff(new_repos, old_repos)
  if (length(added_repos) > 0) {
    report_lines <- c(report_lines, glue("  [+] Repositórios Adicionados ({length(added_repos)}): {paste(added_repos, collapse = ', ')}"))
    for (repo in added_repos) {
      modification_notes <- c(modification_notes, glue("new repository: {repo}"))
    }
  }
  
  # Métricas
  old_m <- extract_metrics(old_data)
  new_m <- extract_metrics(new_data)
  
  if (new_m$citations != old_m$citations) {
    report_lines <- c(report_lines, glue("  [*] Citações: {old_m$citations} -> {new_m$citations}"))
    modification_notes <- c(modification_notes, glue("citations {old_m$citations} to {new_m$citations}"))
  }
  if (new_m$h_index != old_m$h_index) {
    report_lines <- c(report_lines, glue("  [*] Índice-H: {old_m$h_index} -> {new_m$h_index}"))
    modification_notes <- c(modification_notes, glue("h-index {old_m$h_index} to {new_m$h_index}"))
  }
  if (new_m$i10_index != old_m$i10_index) {
    report_lines <- c(report_lines, glue("  [*] Índice-i10: {old_m$i10_index} -> {new_m$i10_index}"))
    modification_notes <- c(modification_notes, glue("i10-index {old_m$i10_index} to {new_m$i10_index}"))
  }
  
  # Artigos e Citações
  old_articles_list <- old_data$scholarData$articles %||% list()
  old_articles <- setNames(old_articles_list, map_chr(old_articles_list, ~normalize_title(.x$title)))
  
  new_articles_list <- new_data$scholarData$articles %||% list()
  new_articles <- setNames(new_articles_list, map_chr(new_articles_list, ~normalize_title(.x$title)))
  
  added_titles <- setdiff(names(new_articles), names(old_articles))
  
  if (length(added_titles) > 0) {
    report_lines <- c(report_lines, glue("\n--- Novas Publicações ({length(added_titles)}) ---"))
    for (norm_title in added_titles) {
      full_title <- new_articles[[norm_title]]$title %||% norm_title
      report_lines <- c(report_lines, glue("    - {str_sub(full_title, 1, 80)}..."))
      modification_notes <- c(modification_notes, glue("new publication: {str_sub(full_title, 1, 50)}..."))
    }
  }
  
  citation_updates <- c()
  common_titles <- intersect(names(new_articles), names(old_articles))
  
  if(length(common_titles) > 0) {
    for (norm_title in common_titles) {
      old_cites_val <- old_articles[[norm_title]]$cited_by$value
      old_cites <- if (is.null(old_cites_val) || !is.numeric(old_cites_val)) 0 else old_cites_val
      
      new_cites_val <- new_articles[[norm_title]]$cited_by$value
      new_cites <- if (is.null(new_cites_val) || !is.numeric(new_cites_val)) 0 else new_cites_val
      
      if (new_cites > old_cites) {
        title <- new_articles[[norm_title]]$title %||% ""
        line <- glue("    - '{str_sub(title, 1, 50)}...': {old_cites} -> {new_cites} (+{new_cites - old_cites})")
        citation_updates <- c(citation_updates, line)
        modification_notes <- c(modification_notes, glue("citation '{str_sub(title, 1, 30)}...' {old_cites} to {new_cites}"))
      }
    }
  }
  
  if (length(citation_updates) > 0) {
    report_lines <- c(report_lines, glue("\n--- Atualizações de Citações ({length(citation_updates)}) ---"))
    report_lines <- c(report_lines, citation_updates)
  }
  
  return(list(report_lines = report_lines, modification_notes = modification_notes))
}

# ==============================================================================
# FUNÇÕES DE GERAÇÃO E ATUALIZAÇÃO DE ARQUIVOS
# ==============================================================================
generate_fallback_file <- function(data, filename) {
  log_info("Gerando o arquivo '{filename}'...")
  tryCatch({
    dir_create(path_dir(filename)) # Garante que o diretório pai exista!
    write_json(data, filename, auto_unbox = TRUE, pretty = TRUE)
    log_info("✅ Arquivo '{filename}' gerado com sucesso!")
    return(TRUE)
  }, error = function(e) {
    log_error("Erro ao escrever ou serializar JSON para '{filename}': {e$message}")
    return(FALSE)
  })
}

update_main_file <- function(main_file, temp_file) {
  # Cria os diretórios caso não existam
  dir_create(path_dir(main_file))
  tryCatch({
    file_move(temp_file, main_file)
    log_info("✓ Arquivo '{main_file}' atualizado com sucesso!")
  }, error = function(e) {
    log_error("Erro ao atualizar '{main_file}' via move: {e$message}. Tentando cópia...")
    tryCatch({
      file_copy(temp_file, main_file, overwrite = TRUE)
      log_info("✓ Arquivo '{main_file}' atualizado via cópia.")
      file_delete(temp_file)
    }, error = function(e_copy) {
      log_error("Erro ao atualizar '{main_file}' via cópia: {e_copy$message}")
    })
  })
}

# ==============================================================================
# EXECUÇÃO PRINCIPAL
# ==============================================================================

# 1. Buscar GitHub e ORCID
github_repos <- c(
  fetch_github_repos(GITHUB_USERNAME_NEPEM, GITHUB_TOKEN_NEPEM),
  fetch_github_repos(GITHUB_USERNAME, GITHUB_TOKEN)
)
orcid_works <- fetch_orcid_works(ORCID_ID)

# 2. Buscar dados do Scholar com fallback
scholar_profile <- NULL
scholar_articles_raw <- NULL

for (i in seq_along(SERPAPI_KEYS)) {
  key <- SERPAPI_KEYS[i]
  log_info("Tentando buscar dados do Scholar com a Chave {i}/{length(SERPAPI_KEYS)}...")
  temp_profile <- fetch_scholar_profile(SCHOLAR_AUTHOR_ID, key)
  temp_articles <- fetch_all_scholar_articles(SCHOLAR_AUTHOR_ID, key)
  
  if (!is.null(temp_profile) && !is.null(temp_articles)) {
    log_info("✓ Sucesso com a Chave {i}.")
    scholar_profile <- temp_profile
    scholar_articles_raw <- temp_articles
    break
  } else {
    log_warn("Falha ao buscar dados com a Chave {i}.")
  }
}

# 3. Lidar com falhas e mesclar
if (is.null(github_repos)) {
  log_error("ERRO CRÍTICO: Não foi possível buscar os dados do GitHub.")
  stop("Falha ao buscar GitHub.")
}
if (is.null(orcid_works)) {
  log_warn("Não foi possível buscar dados do ORCID. Usando apenas o Scholar.")
  orcid_works <- list()
}
if (is.null(scholar_profile)) {
  log_warn("Não foi possível buscar o perfil do Scholar.")
  scholar_profile <- list()
}
if (is.null(scholar_articles_raw)) {
  log_warn("Não foi possível buscar os artigos do Scholar.")
  scholar_articles_raw <- list()
}

names(scholar_articles_raw) <- map_chr(scholar_articles_raw, ~normalize_title(.x$title))

# 4. Mesclagem ORCID + Scholar
log_info("Mesclando dados do ORCID e Google Scholar...")
merged_articles_map <- list()

if (length(orcid_works) > 0) {
  orcid_works_formatados <- map(orcid_works, ~{
    .x$cited_by <- list(value = 0)
    .x$norm_title <- normalize_title(.x$title)
    return(.x)
  })
  is_duplicate <- duplicated(map_chr(orcid_works_formatados, "norm_title"))
  orcid_works_unicos <- orcid_works_formatados[!is_duplicate]
  
  tryCatch({
    norm_titles_unicos <- map_chr(orcid_works_unicos, "norm_title")
    merged_articles_map <- setNames(orcid_works_unicos, norm_titles_unicos)
  }, error = function(e) {
    log_error("Erro ao nomear títulos do ORCID: {e$message}")
  })
}

for (i in seq_along(scholar_articles_raw)) {
  norm_title <- names(scholar_articles_raw)[[i]]
  if (norm_title %in% names(merged_articles_map)) {
    doi <- merged_articles_map[[norm_title]]$doi
    doiLink <- merged_articles_map[[norm_title]]$doiLink
    pubname <- merged_articles_map[[norm_title]]$journalTitle
    scholar_articles_raw[[norm_title]]$doi <- doi %||% "null"
    scholar_articles_raw[[norm_title]]$doiLink <- doiLink %||% "null"
    scholar_articles_raw[[norm_title]]$journalTitle <- ifelse(is.null(pubname) || pubname == "", "null", pubname)
  } else {
    scholar_articles_raw[[norm_title]]$doi <- "null"
    scholar_articles_raw[[norm_title]]$doiLink <- "null"
    pubname <- str_remove_all(scholar_articles_raw[[norm_title]]$publication, "[^A-Za-z\\s]") |> str_trim()
    scholar_articles_raw[[norm_title]]$journalTitle <- ifelse(is.null(pubname) || pubname == "", "null", pubname)
  }
  
  # Default NULL, empty, or 'null' years to "2000" to sort at the end of the list
  year_val <- scholar_articles_raw[[norm_title]]$year
  if (is.null(year_val) || year_val == "" || year_val == "null" || is.na(year_val)) {
    scholar_articles_raw[[norm_title]]$year <- "2000"
  }
}

merged_articles_list <- unname(scholar_articles_raw)

# Ordenação final
if (length(merged_articles_list) > 0) {
  citations <- map_int(merged_articles_list, ~ .x$cited_by$value %||% 0)
  years <- map_int(merged_articles_list, ~ as.integer(gsub("[^0-9]", "", .x$year %||% "0")))
  final_order <- order(citations, years, decreasing = TRUE)
  merged_articles <- merged_articles_list[final_order]
} else {
  merged_articles <- list()
}

log_info("✓ Combinação finalizada. Total de {length(merged_articles)} publicações.")

# 5. Salvar JSON
new_data <- list(
  githubRepos = github_repos,
  scholarData = list(
    profile = list(cited_by = scholar_profile),
    articles = merged_articles
  )
)

old_data <- load_json_data(MAIN_FILENAME)
analysis <- analyze_changes(old_data, new_data)
report_lines <- analysis$report_lines
modification_notes <- analysis$modification_notes

# 6. Escrever e atualizar
if (generate_fallback_file(new_data, TEMP_FILENAME)) {
  separator_line <- paste(rep("=", 50), collapse = "")
  log_info(paste0("\n", separator_line, "\nRELATÓRIO DE MUDANÇAS\n", separator_line))
  
  if (length(report_lines) == 0 && (length(modification_notes) == 0 || modification_notes[1] == "initial data generation")) {
    report_lines <- c("  ✓ Nenhuma mudança detectada.")
  }
  
  for (line in report_lines) {
    log_info(line)
  }
  
  log_info(paste0("\n", separator_line))
  
  if (length(report_lines) > 0 && report_lines[1] == "  ✓ Nenhuma mudança detectada.") {
    log_info("  ✓ Nenhuma mudança de métricas detectada. Arquivo já atualizado.")
    try(file_delete(TEMP_FILENAME), silent = TRUE)
  } else {
    log_info("  [!] Mudanças detectadas. Atualizando '{MAIN_FILENAME}'...")
    update_main_file(MAIN_FILENAME, TEMP_FILENAME)
  }
} else {
  log_error("Falha ao gerar o arquivo temporário.")
  try(file_delete(TEMP_FILENAME), silent = TRUE)
}

log_info("Processo concluído com sucesso!")
