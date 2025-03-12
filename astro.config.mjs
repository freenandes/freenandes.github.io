import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://freenandes.github.io',
    image: {
        service: {
			entrypoint: "/src/images.ts",
		},
    }
});



