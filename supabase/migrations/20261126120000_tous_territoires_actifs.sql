-- Les 11 territoires sont couverts au lancement (décision du 26 novembre 2026).
-- Additif uniquement : aucune table, aucune ligne supprimée, seul le drapeau « actif » change.
update public.territoires set actif = true where actif = false;
