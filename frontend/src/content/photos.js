// Photos used on the public pages (frontend/public/photos), with their free licences.
// All from Wikimedia Commons. CC BY and CC BY-SA photos must show the author and licence:
// they are listed under "Photo credits" in the footer. No photo comes from the Dribbble references.
export const PHOTOS = {
  hero: { name: 'hero-tea', sizes: [640, 960, 1280, 1920], alt: 'landing.photoAlt.hero' },
  hills: { name: 'hills-nyamagabe', sizes: [640, 960, 1280, 1920], alt: 'landing.photoAlt.hills' },
  sunset: { name: 'kigali-sunset', sizes: [640, 1280], alt: 'landing.photoAlt.sunset' },
  planting: { name: 'tree-planting', sizes: [480, 800], alt: 'landing.photoAlt.planting' },
  labelled: { name: 'seedlings-labelled', sizes: [480, 800], alt: 'landing.photoAlt.labelled' },
  bags: { name: 'seedlings-bags', sizes: [480, 800], alt: 'landing.photoAlt.bags' },
}

export const PHOTO_CREDITS = [
  { title: 'Tea plantation, Western Rwanda', author: 'Synkubito', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Tea_plantation,_Western_Rwanda.jpg' },
  { title: 'Hills of Nyamagabe in Rwanda', author: 'Ericnkurunziza', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Hills_of_Nyamagabe_in_Rwanda.jpg' },
  { title: 'Kigali thousand hills horizon as the sun sets', author: 'Ndpatrick45', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Kigali_thousand_hills_horizon_as_the_sun_sets.jpg' },
  { title: 'Gutera igiti', author: 'Rogerirakoze', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Gutera_igiti.jpg' },
  { title: 'Leopard tree seedlings in a nursery', author: 'Chandapiwa Malema', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Leopard_tree_seedlings_in_a_nursery.jpg' },
  { title: 'Tree seedlings in a local nursery, Irawo, Nigeria', author: 'NigerianScribe', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Tree_seedlings_in_a_local_nursery,_Irawo,_Atisbo,_Oyo_State,_Nigeria.jpg' },
]

// "/photos/hero-tea-640.webp 640w, ..." for <img srcSet>
export const srcSet = (photo) => photo.sizes.map((w) => `/photos/${photo.name}-${w}.webp ${w}w`).join(', ')
export const src = (photo) => `/photos/${photo.name}-${photo.sizes[0]}.webp`
