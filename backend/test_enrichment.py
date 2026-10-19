
import unittest

from enrichment import hypergeometric_p_value, benjamini_hochberg, run_ora


class TestEnrichment(unittest.TestCase):

    def test_hypergeometric_probability(self):
        # 20 genes en el universo, 5 anotados,
        # se seleccionan 4 y 3 están anotados.
        result = hypergeometric_p_value(20, 5, 4, 3)
        self.assertAlmostEqual(result, 0.0319917441, places=8)

    def test_benjamini_hochberg(self):
        result = benjamini_hochberg([0.01, 0.04, 0.03])
        self.assertAlmostEqual(result[0], 0.03)
        self.assertAlmostEqual(result[1], 0.04)
        self.assertAlmostEqual(result[2], 0.04)

    def test_ora_finds_enriched_term(self):
        universe = {
            "GENE1", "GENE2", "GENE3", "GENE4",
            "GENE5", "GENE6", "GENE7", "GENE8",
            "GENE9", "GENE10",
        }
        selected = {"GENE1", "GENE2", "GENE3"}

        annotations = {
            "GENE1": [{"id": "GO:0000001", "name": "Proceso A"}],
            "GENE2": [{"id": "GO:0000001", "name": "Proceso A"}],
            "GENE3": [{"id": "GO:0000001", "name": "Proceso A"}],
            "GENE4": [{"id": "GO:0000001", "name": "Proceso A"}],
            "GENE5": [{"id": "GO:0000002", "name": "Proceso B"}],
            "GENE6": [{"id": "GO:0000002", "name": "Proceso B"}],
        }

        results = run_ora(
            selected_genes=selected,
            universe_genes=universe,
            annotations_by_gene=annotations,
            significance_threshold=0.05,
            max_results=20,
        )

        self.assertTrue(any(
            item["go_id"] == "GO:0000001"
            for item in results
        ))


if __name__ == "__main__":
    unittest.main()
