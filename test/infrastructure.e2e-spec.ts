import * as fs from 'fs';
import * as path from 'path';

describe('Infrastructure (TASK-15)', () => {
  const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
  const frontendPath = path.join(__dirname, '..', 'frontend-placeholder', 'index.html');

  it('docker-compose.yml should have the correct Traefik labels for all services', () => {
    const fileContents = fs.readFileSync(dockerComposePath, 'utf8');

    // Traefik labels
    expect(fileContents).toContain('traefik.enable=true');
    expect(fileContents).toContain('traefik.http.routers.dashboard.rule=Host(`traefik.localhost`)');
    expect(fileContents).toContain('traefik.http.routers.dashboard.service=api@internal');

    // Frontend labels
    expect(fileContents).toContain('traefik.http.routers.frontend.rule=Host(`localhost`)');

    // Backend labels
    expect(fileContents).toContain('traefik.http.routers.backend.rule=Host(`api.localhost`)');
    expect(fileContents).toContain('traefik.http.services.backend.loadbalancer.server.port=3000');
  });

  it('frontend placeholder should contain the "Coming Soon" text', () => {
    const fileContents = fs.readFileSync(frontendPath, 'utf8');
    expect(fileContents).toContain('<h1>SoilTech Frontend — Coming Soon</h1>');
  });
});
