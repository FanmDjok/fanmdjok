-- Données financières optionnelles par bien (alimentent l'onglet Analyses)
alter table public.properties
  add column if not exists prix_achat numeric(16,2) check (prix_achat is null or prix_achat >= 0),
  add column if not exists valeur_actuelle numeric(16,2) check (valeur_actuelle is null or valeur_actuelle >= 0),
  add column if not exists capital_restant numeric(16,2) check (capital_restant is null or capital_restant >= 0),
  add column if not exists mensualite numeric(14,2) check (mensualite is null or mensualite >= 0),
  add column if not exists taux_credit numeric(5,2) check (taux_credit is null or (taux_credit >= 0 and taux_credit <= 30)),
  add column if not exists duree_restante_mois integer check (duree_restante_mois is null or (duree_restante_mois >= 0 and duree_restante_mois <= 480)),
  add column if not exists taxe_fonciere numeric(14,2) check (taxe_fonciere is null or taxe_fonciere >= 0),
  add column if not exists assurance numeric(14,2) check (assurance is null or assurance >= 0),
  add column if not exists charges_copro numeric(14,2) check (charges_copro is null or charges_copro >= 0),
  add column if not exists entretien numeric(14,2) check (entretien is null or entretien >= 0);
