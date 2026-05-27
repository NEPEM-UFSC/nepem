---
title: Análise AMMI
linktitle: "8. Análise AMMI"
toc: true
type: docs
date: "2021/07/09"
draft: false
menu:
  gemsr:
    parent: GEMS-R
    weight: 9
weight: 9
---


<script type="text/javascript" src="http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML" ></script>




```r
library(metan)
## Registered S3 method overwritten by 'GGally':
##   method from   
##   +.gg   ggplot2
## |=========================================================|
## | Multi-Environment Trial Analysis (metan) v1.15.0        |
## | Author: Tiago Olivoto                                   |
## | Type 'citation('metan')' to know how to cite metan      |
## | Type 'vignette('metan_start')' for a short tutorial     |
## | Visit 'https://bit.ly/pkgmetan' for a complete tutorial |
## |=========================================================|
library(rio)

# gerar tabelas html
print_tbl <- function(table, digits = 3, ...){
  knitr::kable(table, booktabs = TRUE, digits = digits, ...)
}


df_ge <- import("http://bit.ly/df_ge", setclass = "tbl")
inspect(df_ge, verbose = FALSE) %>% print_tbl()
```



|Variable  |Class     |Missing |Levels | Valid_n|    Min| Median|    Max| Outlier|
|:---------|:---------|:-------|:------|-------:|------:|------:|------:|-------:|
|ENV       |character |No      |0      |     156|     NA|     NA|     NA|      NA|
|GEN       |character |No      |0      |     156|     NA|     NA|     NA|      NA|
|BLOCO     |character |No      |0      |     156|     NA|     NA|     NA|      NA|
|ALT_PLANT |numeric   |No      |-      |     156|   1.71|   2.52|   3.04|       0|
|ALT_ESP   |numeric   |No      |-      |     156|   0.75|   1.41|   1.88|       0|
|COMPES    |numeric   |No      |-      |     156|  11.50|  15.13|  17.94|       1|
|DIAMES    |numeric   |No      |-      |     156|  43.48|  49.95|  54.86|       0|
|COMP_SAB  |numeric   |No      |-      |     156|  23.49|  28.67|  34.66|       0|
|DIAM_SAB  |numeric   |No      |-      |     156|  12.90|  16.00|  18.56|       0|
|MGE       |numeric   |No      |-      |     156| 105.72| 174.63| 250.89|       0|
|NFIL      |numeric   |No      |-      |     156|  12.40|  16.00|  21.20|       1|
|MMG       |numeric   |No      |-      |     156| 218.32| 342.07| 451.68|       1|
|NGE       |numeric   |No      |-      |     156| 331.80| 509.20| 696.60|       3|

## O modelo AMMI
A análise AMMI utiliza análise aditiva de variância aos fatores principais (genótipo e ambiente) e decomposição por valores singulares ao residual do modelo aditivo, isto é, o efeito da GEI somado ao erro experimental. Esta matriz dos efeitos não aditivos, então, pode ser aproximadamente exibida por meio de biplots[^1]. Este método tem ganhado destaque nas últimas décadas, principalmente devido a rápida evolução computacional, o que tornou possível as complexas decomposições de matrizes de alta ordem.

De posse de uma matriz de dupla entrada oriunda de ensaios multiambientes, a estimativa da variável resposta do \\(i\\)-ésimo genótipo no \\(i\\)-ésimo ambiente é obtida utilizando AMMI de acordo com o seguinte modelo:

$$
{y_{ij}} = \mu  + {\alpha_i} + {\tau_j} + \sum\limits_{k = 1}^k {{\lambda _k}{a_{ik}}} {t_{jk}} + {\rho _{ij}} + {\varepsilon _{ij}}
$$


onde \\({\lambda_k}\\) é o valor singular para o \\(k\\)-ésimo eixo do componente principal; \\(a_{ik}\\) é o \\(i\\)-ésimo elemento do \\(k\\)-ésimo autovetor de genótipos;  \\(t_{jk}\\) é o \\(j\\)-ésimo elemento do \\(k\\)-ésimo autovetor de ambientes. Um resíduo \\(\rho _{ij}\\) permanece, se todos os \\(k\\)-PCAs não são considerados, onde \\(k\\) = \\(min(G-1; E-1)\\). O modelo AMMI é computado com a função `performs_ammi()`


```r
ammi_model <- 
  performs_ammi(df_ge,
                env = ENV,
                gen = GEN,
                rep = BLOCO,
                resp = MGE:MMG,
                verbose = FALSE)
```





#### Analise residual

\\(\hat y_{ij} = \bar y_{i.} + \bar y_{.j} - \bar y_{..}\\) 


```r
plot(ammi_model)
```

<img src="/tutorials/gemsr/08_ammi_files/figure-html/unnamed-chunk-3-1.png" width="768" style="display: block; margin: auto;" />



### Escoha do número de IPCAs retidos

A análise AMMI aplica a técnica de decomposição por valores singulares na matriz dos efeitos não aditivos do modelo (__*A*__). Logo, esta matriz pode ser aproximada pela pelo seguinte modelo: \\(\mathbf{A = U \lambda V^T}\\), onde onde \\(U\\) é uma matriz \\(g\\) \\(\times\\) \\(e\\) contendo os vetores singulares de \\(\mathbf{AA^T}\\) e formam a base ortonormal para os efeitos de genótipos; \\(\mathbf{V^T}\\) é uma matriz \\(e\\) \\(\times\\) \\(e\\) que contém os vetores singulares de  \\(\mathbf{A^TA}\\) e formam a base ortonormal para os efeitos de ambientes; e \\(\mathbf{\lambda}\\) é uma matriz diagonal \\(e\\) \\(\times\\) \\(e\\) contendo \\(k\\)-valores singulares de \\(\mathbf{A^{T}A}\\) , onde \\(k\\) = \\(min(G-1; E-1)\\). Assim, diferentes modelos (dependendo do número de IPCAs utilizados) podem ser utilziados para estimar o rendimento do genótipo \\(i\\) no ambiente \\(j\\). A tabela abaixo mostra os possíveis modelos. No modelo AMMI0 apenas os efeitos aditivos são considerados. No modelo AMMI1, o primeiro termo multiplicativo é considerado, e assim por diante, até o modelo AMMIF, onde \\(min(G-1;E-1)\\) termos são considerados. 



| Membros da família AMMI | Resposta esperado do genótipo \\(i\\) no ambiente \\(j\\)                            |
|:----------------------------------|:------------------------------------------------------------------------------|
| AMMI0            |\\(\hat y_{ij} = \bar y_{i.} + \bar y_{.j} - \bar y_{..}\\)                    |
| AMMI1            |\\(\hat y_{ij} = \bar y_{i.} + \bar y_{.j} - \bar y_{..} +\lambda_1 a_{i1}t_{j1}\\) |
| AMMI2            |\\(\hat y_{ij} = \bar y_{i.} + \bar y_{.j} - \bar y_{..} +\lambda_1 a_{i1}t_{j1}+\lambda_2 a_{i2}t_{j2}\\) |
| ...              |                                                                               |
| AMMIF            |\\(\hat y_{ij} = \bar y_{i.} + \bar y_{.j} - \bar y_{..} +\lambda_1 a_{i1}t_{j1}+\lambda_2 a_{i2}t_{j2}+...+\lambda_p a_{ip}t_{jp}\\)  

A escolha do número de IPCAs a ser utilizado é baseada em basicamente dois critérios de sucesso de análise: **Postdiscritive sucess** e **Predictive sucess**. Por definição, **predictive sucess** significa literalmente a afirmação prévia do que acontecerá em algum momento futuro. Neste contexto, testes de validação cruzada (*cross-validation*) podem ser utilizados para avaliar o sucesso preditivo dos membros de modelos da familia AMMI. Por outro lado, **postdiscritive sucess** significa fazer uma afirmação ou dedução sobre algo que aconteceu no passado. Na escolha do número de IPCAs da análise AMMI, \index{AMMI}este sucesso pode ser calculado utilizando testes como o proposto por Gollob (1968)[^2]. 

* **Postdiscritive sucess**
Testes de hipóteses são realizados e probabilidades de erro são atribuídas para cada membro da família de modelos AMMI utilizando a distribuição de graus de liberdade proposto por Gollob (1968)[^2]. Assim, é possível identificar qual é o número ideal de IPCAs a ser considerado na estimativa. 


```r
gmd(ammi_model, "ipca_pval") %>% print_tbl()
## Class of the model: performs_ammi
## Variable extracted: Pr(>F)
```



|PC  | DF|   MGE|  NFIL|   MMG|
|:---|--:|-----:|-----:|-----:|
|PC1 | 14| 0.000| 0.000| 0.000|
|PC2 | 12| 0.018| 0.015| 0.001|
|PC3 | 10| 0.057| 0.027| 0.003|

```r
gmd(ammi_model, "ipca_expl") %>% print_tbl()
## Class of the model: performs_ammi
## Variable extracted: Proportion
```



|PC  | DF|  MGE| NFIL|  MMG|
|:---|--:|----:|----:|----:|
|PC1 | 14| 65.9| 53.5| 63.4|
|PC2 | 12| 19.8| 25.8| 20.3|
|PC3 | 10| 14.3| 20.8| 16.4|

```r
gmd(ammi_model, "ipca_accum") %>% print_tbl()
## Class of the model: performs_ammi
## Variable extracted: Accumulated
```



|PC  | DF|   MGE|  NFIL|   MMG|
|:---|--:|-----:|-----:|-----:|
|PC1 | 14|  65.9|  53.5|  63.4|
|PC2 | 12|  85.7|  79.2|  83.6|
|PC3 | 10| 100.0| 100.0| 100.0|



\index{predictive sucess}

Utilizando a função `cv_ammif()`, é possível realizar um teste de validação cruzada para a família de modelos AMMI (AMMI0-AMMIF) usando dados com repetições. Automaticamente, a primeira validação é realizada considerando a AMMIF (todos possíveis IPCAs são usados). Considerando esse modelo, o conjunto de dados original é dividido em dois conjuntos de dados: dados de modelagem e dados de validação. 

O conjunto de dados "modelagem" possui todas as combinações (genótipo *vs* ambiente) com o número de repetições informado no argumento `nrepval`. O conjunto de dados "validação" tem uma repetição. A divisão do conjunto de dados em dados de modelagem e validação depende do design informado. Considerando um delineamento de blocos completos casualizados (DBC)\index{DBC}, blocos completos são aleatoriamente selecionados dentro de ambientes, como sugerido por Piepho (1994)[^4]. O bloco restante serve dados de validação. Se `design = "CRD"` for informado, assim declarando que um delineamento intericamente casualizado (DIC) \index{DIC} foi usado, observações são aleatoriamente selecionadas para cada tratamento (combinação genótipo-*vs*-ambiente). Este é o mesmo procedimento sugerido por Gauch (1988)[^3]. Os valores estimados para o membro da família AMMI em estudo são então comparados com os dados de "validação" e um erro de predição \\(\hat{z}_{ij}\\) é estimado para cada tratamento. A raiz quadrada do quadrado médio da diferença de predição (RMSPD) é calculado. Este procedimento é repetido *n* vezes, utilizando o argumento `nboot = n`. Ao final do procedimento, o algorítimo armazena as *n* estimativas do RMSPD para o modelo em questão, e um novo modelo é então testado seguindo os mesmos passos. Uma barra de progresso é mostrada por padrão. Assim, é possível verificar o status do processo. Se necessário, a barra de progresso pode ser desabilitada informando o argumento `verbose = FALSE` na função.




```r
# Validação cruzada para os membros de modelos da família AMMI
cvalida <- 
  cv_ammif(df_ge,
          env = ENV,
          gen = GEN,
          rep = BLOCO,
          resp = MGE,
          nboot = 20,
          verbose = FALSE)
p1 <- plot(cvalida)
p2 <- plot(cvalida,
          width.boxplot = 0.5,
          col.boxplot = "white",
          plot_theme = theme_metan_minimal())
p1 + p2
```

<img src="/tutorials/gemsr/08_ammi_files/figure-html/unnamed-chunk-5-1.png" width="960" />



#### *Valores estimados pelo modelo AMMI*

```r
predicted <- predict(ammi_model, naxis = c(3, 2, 1))
print_tbl(predicted$MGE)
```



|ENV |GEN |       Y| RESIDUAL|   Ypred|     ResAMMI| YpredAMMI|   AMMI0|
|:---|:---|-------:|--------:|-------:|-----------:|---------:|-------:|
|A1  |H1  | 202.690|   -7.555| 210.245|  -7.5554235|  202.6896| 210.245|
|A1  |H10 | 192.409|    2.018| 190.391|   2.0179625|  192.4092| 190.391|
|A1  |H11 | 188.254|   -5.484| 193.738|  -5.4842169|  188.2537| 193.738|
|A1  |H12 | 180.480|   -3.492| 183.972|  -3.4917843|  180.4799| 183.972|
|A1  |H13 | 218.604|   12.268| 206.336|  12.2676643|  218.6040| 206.336|
|A1  |H2  | 203.831|   -9.666| 213.497|  -9.6660847|  203.8311| 213.497|
|A1  |H3  | 198.207|    2.254| 195.954|   2.2537474|  198.2075| 195.954|
|A1  |H4  | 201.823|   -8.935| 210.759|  -8.9354843|  201.8230| 210.759|
|A1  |H5  | 192.698|  -17.435| 210.133| -17.4353770|  192.6976| 210.133|
|A1  |H6  | 231.853|   17.355| 214.498|  17.3552882|  231.8529| 214.498|
|A1  |H7  | 181.548|  -16.001| 197.549| -16.0012644|  181.5482| 197.549|
|A1  |H8  | 196.110|    9.752| 186.358|   9.7517041|  196.1098| 186.358|
|A1  |H9  | 204.175|   24.923| 179.251|  24.9232686|  204.1748| 179.251|
|A2  |H1  | 188.196|    8.953| 179.244|   8.9526968|  188.1963| 179.244|
|A2  |H10 | 159.892|    0.503| 159.390|   0.5026040|  159.8924| 159.390|
|A2  |H11 | 163.608|    0.871| 162.736|   0.8711752|  163.6077| 162.736|
|A2  |H12 | 131.275|  -21.696| 152.970| -21.6957254|  131.2746| 152.970|
|A2  |H13 | 169.069|   -6.265| 175.335|  -6.2654949|  169.0695| 175.335|
|A2  |H2  | 218.856|   36.360| 182.496|  36.3597241|  218.8555| 182.496|
|A2  |H3  | 190.942|   25.990| 164.952|  25.9895136|  190.9418| 164.952|
|A2  |H4  | 197.464|   17.707| 179.757|  17.7065093|  197.4636| 179.757|
|A2  |H5  | 186.242|    7.110| 179.132|   7.1101488|  186.2417| 179.132|
|A2  |H6  | 215.028|   31.532| 183.496|  31.5319535|  215.0282| 183.496|
|A2  |H7  | 143.801|  -22.747| 166.548| -22.7471679|  143.8009| 166.548|
|A2  |H8  | 112.961|  -42.396| 155.357| -42.3955883|  112.9612| 155.357|
|A2  |H9  | 112.330|  -35.920| 148.250| -35.9203488|  112.3297| 148.250|
|A3  |H1  | 156.817|   -0.802| 157.619|  -0.8022958|  156.8165| 157.619|
|A3  |H10 | 120.558|  -17.207| 137.765| -17.2068874|  120.5581| 137.765|
|A3  |H11 | 140.715|   -0.396| 141.112|  -0.3964161|  140.7153| 141.112|
|A3  |H12 | 148.362|   17.016| 131.345|  17.0162025|  148.3617| 131.345|
|A3  |H13 | 181.602|   27.892| 153.710|  27.8915272|  181.6017| 153.710|
|A3  |H2  | 160.308|   -0.563| 160.871|  -0.5633588|  160.3076| 160.871|
|A3  |H3  | 138.987|   -4.341| 143.328|  -4.3407837|  138.9867| 143.328|
|A3  |H4  | 143.454|  -14.678| 158.132| -14.6779798|  143.4543| 158.132|
|A3  |H5  | 161.118|    3.611| 157.507|   3.6107590|  161.1175| 157.507|
|A3  |H6  | 137.067|  -24.804| 161.871| -24.8042110|  137.0672| 161.871|
|A3  |H7  | 155.655|   10.732| 144.923|  10.7320919|  155.6554| 144.923|
|A3  |H8  | 141.431|    7.699| 133.732|   7.6987349|  141.4307| 133.732|
|A3  |H9  | 122.468|   -4.157| 126.625|  -4.1573828|  122.4679| 126.625|
|A4  |H1  | 187.285|   -0.595| 187.880|  -0.5949776|  187.2850| 187.880|
|A4  |H10 | 182.713|   14.686| 168.026|  14.6863209|  182.7125| 168.026|
|A4  |H11 | 176.382|    5.009| 171.373|   5.0094578|  176.3823| 171.373|
|A4  |H12 | 169.778|    8.171| 161.607|   8.1713072|  169.7780| 161.607|
|A4  |H13 | 150.078|  -33.894| 183.971| -33.8936966|  150.0776| 183.971|
|A4  |H2  | 165.002|  -26.130| 191.132| -26.1302806|  165.0019| 191.132|
|A4  |H3  | 149.686|  -23.902| 173.589| -23.9024773|  149.6862| 173.589|
|A4  |H4  | 194.300|    5.907| 188.393|   5.9069548|  194.3005| 188.393|
|A4  |H5  | 194.482|    6.714| 187.768|   6.7144693|  194.4824| 187.768|
|A4  |H6  | 168.050|  -24.083| 192.133| -24.0830307|  168.0496| 192.133|
|A4  |H7  | 203.201|   28.016| 175.184|  28.0163404|  203.2008| 175.184|
|A4  |H8  | 188.938|   24.945| 163.993|  24.9451493|  188.9383| 163.993|
|A4  |H9  | 172.041|   15.154| 156.886|  15.1544630|  172.0409| 156.886|


### Biplot AMMI1



```r
p1 <- plot_scores(ammi_model)
p2 <- plot_scores(ammi_model,
                  x.lab = "Massa de grãos por espiga",
                  col.segm.env = "black",
                  col.gen = "gray",
                  col.env = "black",
                  highlight = c("H8", "H6", "H2"),
                  plot_theme = theme_metan_minimal())
arrange_ggplot(p1, p2, tag_levels = "a")
```

<img src="/tutorials/gemsr/08_ammi_files/figure-html/unnamed-chunk-7-1.png" width="960" style="display: block; margin: auto;" />


### Biplot AMMI2



```r
p3 <- plot_scores(ammi_model, type = 2)
p4 <- plot_scores(ammi_model,
                  type = 2,
                  col.segm.env = "black",
                  col.gen = "gray",
                  col.env = "black",
                  highlight = c("H8", "H6", "H2"),
                  plot_theme = theme_metan_minimal())

arrange_ggplot(p3, p4, tag_levels = "a")
```

<img src="/tutorials/gemsr/08_ammi_files/figure-html/unnamed-chunk-8-1.png" width="960" style="display: block; margin: auto;" />



# Temas

```r
p <-
plot_scores(ammi_model,
            type = 2,
            col.segm.env = "black",
            col.gen = "gray",
            col.env = "black",
            highlight = c("H8", "H6", "H2"),
            col.highlight = "blue",
            size.tex.env = 5)

p1 <- p  + ggthemes::theme_base()
p2 <- p  + ggthemes::theme_clean()
p3 <- p  + ggthemes::theme_excel_new()
p4 <- p  + ggthemes::theme_solarized()
p5 <- p  + ggthemes::theme_solid()


arrange_ggplot((p1 + p2 + p3) / (p4 + p5),
               tag_levels = "i",
               tag_prefix = "p.",
               tag_suffix = ")",
               guides = "collect",
               title = "Meus biplots AMMI",
               subtitle = "Combinados no metan",
               caption = "Fonte: ...")
```

<img src="/tutorials/gemsr/08_ammi_files/figure-html/unnamed-chunk-9-1.png" width="1152" />


[^1]: Gabriel, K. R. (1971). The biplot graphic display of matrices with application to principal component analysis. Biometrika, 58(3), 453–467. https://doi.org/10.2307/2334381


[^2]: Gollob, H. F. (1968). A statistical model which combines features of factor analytic and analysis of variance techniques. Psychometrika, 33(1), 73–115. https://doi.org/10.1007/BF02289676

[^3]: Gauch, H. G., & Zobel, R. W. (1988). Predictive and postdictive success of statistical analyses of yield trials. Theoretical and Applied Genetics, 76(1), 1–10. https://doi.org/10.1007/BF00288824


[^4]: Piepho, H.-P. (1994). Best Linear Unbiased Prediction (BLUP) for regional yield trials: A comparison to additive main effects and multiplicative interaction (AMMI) analysis. Theoretical and Applied Genetics, 89(5), 647–654. https://doi.org/10.1007/BF00222462

