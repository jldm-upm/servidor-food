#!/bin/sh

URL='https://world.openfoodfacts.org'

echo "Iniciando actualización desde: $URL"
for tax in 'additives_classes.json' 'additives.json' 'allergens.json' 'brands.json' 'countries.json' 'ingredients_analysis.json' 'ingredients.json' 'labels.json' 'languages.json' 'nova_groups.json' 'nutrient_levels.json' 'states.json';
do
    echo "curl $URL/data/taxonomies/$tax -O"
    curl $URL/data/taxonomies/$tax -O
done

echo "curl $URL/categories.json"
curl $URL/categories.json -O

echo "Actualización terminada"
