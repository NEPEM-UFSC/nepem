import os
import re


# Caminho do script, pq ele vai ficar em authors
authors_dir = os.path.join(os.path.dirname(__file__))


def update_weights():
    # Lista os diretórios
    authors = [
        d for d in os.listdir(authors_dir)
        if os.path.isdir(os.path.join(authors_dir, d))
    ]

    # Ignora o diretório "admin"
    authors = [d for d in authors if d != "admin"]

    # Ordena os diretórios alfabeticamente
    authors.sort()

    # Atualiza os pesos nos arquivos _index.md
    for weight, author_dir in enumerate(authors, start=1):
        index_file = os.path.join(authors_dir, author_dir, '_index.md')

        if os.path.exists(index_file):
            # Lê o arquivo inteiro
            with open(index_file, 'r', encoding='utf-8') as file:
                content = file.read()

            # Verifica se o arquivo tem conteúdo
            if content.strip():
                # Substitui o valor do weight mantendo o formato original
                # Procura por "weight: " seguido de qualquer número
                new_content = re.sub(
                    r'weight:\s*\d+',
                    f'weight: {weight}',
                    content
                )

                # Escreve o conteúdo atualizado de volta no arquivo
                with open(index_file, 'w', encoding='utf-8') as file:
                    file.write(new_content)

                print(f"Atualizado: {author_dir}/_index.md -> peso: {weight}")
            else:
                raise FileNotFoundError(
                    f"Conteúdo não encontrado no arquivo: {index_file}"
                )
        else:
            print(
                f"Aviso: Arquivo '_index.md' não encontrado no diretório: "
                f"{author_dir}"
            )


if __name__ == "__main__":
    update_weights()