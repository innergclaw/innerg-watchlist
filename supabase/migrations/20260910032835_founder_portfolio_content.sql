-- Holdings are stored only in the private research table, never in public assets.
alter table public.innerg_research_content drop constraint innerg_research_content_id_check;
alter table public.innerg_research_content add constraint innerg_research_content_id_check
  check (id in ('news','brief','mover','portfolio'));
