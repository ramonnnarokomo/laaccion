-- Secciones de la cabecera de la maqueta. Son datos de estructura, no de prueba;
-- se pueden renombrar o reordenar desde el panel editorial.
insert into category (name, slug, description, sort_order)
values ('La Acción', 'la-accion', 'Ideas y actualidad', 10),
       ('La Mónada', 'la-monada', 'Ideas diarias', 20),
       ('La Asociación', 'la-asociacion', 'Cultura y sociedad', 30),
       ('La Comunidad', 'la-comunidad', 'Participación', 40);
