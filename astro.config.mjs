import { defineConfig, passthroughImageService, squooshImageService } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://freenandes.github.io',
    image: {
        // service: passthroughImageService(),
        // service: squooshImageService(),
        service: {
			entrypoint: "/src/images.ts",
		},
    }
});



