
from collections import defaultdict
from math import comb


def hypergeometric_p_value(
    population_size: int,
    annotated_in_population: int,
    selected_size: int,
    annotated_in_selected: int,
) -> float:
    """
    Probabilidad de observar annotated_in_selected o más
    genes anotados bajo una distribución hipergeométrica.

    population_size: tamaño del universo de referencia.
    annotated_in_population: genes del universo anotados
        con el término GO.
    selected_size: número de genes seleccionados.
    annotated_in_selected: genes seleccionados anotados
        con el término GO.
    """
    if population_size <= 0:
        raise ValueError("El universo debe contener genes.")

    if not 0 <= annotated_in_population <= population_size:
        raise ValueError("Número de genes anotados inválido.")

    if not 0 <= selected_size <= population_size:
        raise ValueError("Tamaño de selección inválido.")

    if not 0 <= annotated_in_selected <= min(
        selected_size, annotated_in_population
    ):
        raise ValueError("Número de genes seleccionados inválido.")

    denominator = comb(population_size, selected_size)

    if denominator == 0:
        return 1.0

    minimum = max(
        annotated_in_selected,
        0,
    )

    maximum = min(selected_size, annotated_in_population)

    numerator = sum(
        comb(annotated_in_population, k)
        * comb(
            population_size - annotated_in_population,
            selected_size - k,
        )
        for k in range(minimum, maximum + 1)
    )

    return min(1.0, numerator / denominator)


def benjamini_hochberg(p_values: list[float]) -> list[float]:
    """Devuelve valores p ajustados por Benjamini-Hochberg."""
    count = len(p_values)

    if count == 0:
        return []

    if any(not 0 <= value <= 1 for value in p_values):
        raise ValueError("Los valores p deben estar entre 0 y 1.")

    ordered_indices = sorted(
        range(count),
        key=lambda index: p_values[index],
    )

    adjusted = [1.0] * count
    running_minimum = 1.0

    for rank_index in range(count - 1, -1, -1):
        original_index = ordered_indices[rank_index]
        rank = rank_index + 1

        candidate = p_values[original_index] * count / rank
        running_minimum = min(running_minimum, candidate)

        adjusted[original_index] = min(1.0, running_minimum)

    return adjusted


def run_ora(
    selected_genes: set[str],
    universe_genes: set[str],
    annotations_by_gene: dict[str, list[dict[str, str]]],
    significance_threshold: float = 0.05,
    max_results: int = 20,
) -> list[dict]:
    """
    Ejecuta un análisis de sobrerrepresentación de términos GO.

    annotations_by_gene:
        {
            "BRCA1": [
                {"id": "GO:0006281", "name": "DNA repair"}
            ]
        }

    Los conjuntos de genes deben contener identificadores
    coherentes y pertenecer al mismo organismo.
    """
    if not 0 < significance_threshold <= 1:
        raise ValueError("El umbral debe ser mayor que 0 y <= 1.")

    if not 1 <= max_results <= 100:
        raise ValueError("max_results debe estar entre 1 y 100.")

    universe = {gene.strip().upper() for gene in universe_genes}
    selected = {
        gene.strip().upper() for gene in selected_genes
    } & universe

    if not universe:
        raise ValueError("El universo de referencia está vacío.")

    if not selected:
        raise ValueError(
            "No hay genes seleccionados dentro del universo."
        )

    genes_by_term = defaultdict(set)
    names_by_term = {}

    for gene in universe:
        for annotation in annotations_by_gene.get(gene, []):
            go_id = annotation.get("id")
            go_name = annotation.get("name")

            if not go_id or not go_name:
                continue

            genes_by_term[go_id].add(gene)
            names_by_term[go_id] = go_name

    population_size = len(universe)
    selected_size = len(selected)
    results = []

    for go_id, annotated_genes in genes_by_term.items():
        selected_annotated = selected & annotated_genes

        if not selected_annotated:
            continue

        p_value = hypergeometric_p_value(
            population_size=population_size,
            annotated_in_population=len(
                annotated_genes & universe
            ),
            selected_size=selected_size,
            annotated_in_selected=len(selected_annotated),
        )

        results.append({
            "go_id": go_id,
            "term": names_by_term[go_id],
            "overlap": len(selected_annotated),
            "selected_genes": sorted(selected_annotated),
            "population_annotated": len(
                annotated_genes & universe
            ),
            "p_value": p_value,
        })

    adjusted_values = benjamini_hochberg(
        [item["p_value"] for item in results]
    )

    for item, adjusted in zip(results, adjusted_values):
        item["adjusted_p_value"] = adjusted

    results = [
        item for item in results
        if item["adjusted_p_value"] <= significance_threshold
    ]

    results.sort(
        key=lambda item: (
            item["adjusted_p_value"],
            item["p_value"],
            item["go_id"],
        )
    )

    return results[:max_results]
