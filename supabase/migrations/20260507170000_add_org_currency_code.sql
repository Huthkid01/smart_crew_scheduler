alter table organizations
add column if not exists currency_code text not null default 'USD';
