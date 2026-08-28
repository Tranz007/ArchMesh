import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProjectWithPlugins } from '../orchestrator.js';
import { javascriptTypeScriptPlugin } from '../languages/javascript-typescript.js';
import { angularAdapter } from './angular.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture(prefix: string, files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `archmesh-angular-${prefix}-`));
  tempDirs.push(root);
  await Promise.all(Object.entries(files).map(async ([relative, content]) => {
    const destination = path.join(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content, 'utf8');
  }));
  return root;
}

async function scan(root: string) {
  return scanProjectWithPlugins(root, {
    languagePlugins: [javascriptTypeScriptPlugin],
    frameworkAdapters: [angularAdapter],
  });
}

describe('Angular framework adapter', () => {
  it('enriches components, templates, injectables, and constructor DI relationships', async () => {
    const root = await fixture('component-di', {
      'package.json': JSON.stringify({ dependencies: { '@angular/core': '^20.0.0' } }),
      'tsconfig.json': JSON.stringify({ compilerOptions: { moduleResolution: 'Bundler', module: 'ESNext' } }),
      'src/app/orders.service.ts': `
        import { Injectable } from '@angular/core';
        @Injectable({ providedIn: 'root' })
        export class OrdersService {}
      `,
      'src/app/orders.component.ts': `
        import { Component } from '@angular/core';
        import { OrdersService } from './orders.service';
        @Component({
          selector: 'app-orders',
          standalone: true,
          templateUrl: './orders.component.html'
        })
        export class OrdersComponent {
          constructor(readonly orders: OrdersService) {}
        }
      `,
      'src/app/orders.component.html': `<h1>Orders</h1>`,
    });

    const graph = await scan(root);
    const component = graph.nodes.find((node) => node.path === 'src/app/orders.component.ts');
    const service = graph.nodes.find((node) => node.path === 'src/app/orders.service.ts');
    const template = graph.nodes.find((node) => node.path === 'src/app/orders.component.html');

    expect(component).toMatchObject({
      kind: 'component',
      metadata: {
        framework: 'angular',
        angularEntity: 'component',
        componentName: 'OrdersComponent',
        selector: 'app-orders',
        standalone: true,
        templateUrl: './orders.component.html',
      },
    });
    expect(service).toMatchObject({
      kind: 'service',
      metadata: {
        framework: 'angular',
        angularEntity: 'injectable',
        serviceName: 'OrdersService',
      },
    });
    expect(template?.metadata).toMatchObject({ framework: 'angular', resourceType: 'Angular template' });
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: component?.id,
        target: service?.id,
        relation: 'depends-on',
        label: 'Angular DI: OrdersService',
      }),
      expect.objectContaining({
        source: component?.id,
        target: template?.id,
        relation: 'contains',
        label: 'Angular template',
      }),
    ]));
    expect(graph.metadata).toMatchObject({
      frameworkAdapters: 'angular',
      angularComponentCount: 1,
      angularInjectableCount: 1,
      angularTemplateCount: 1,
    });
  });

  it('recognizes inject() dependency injection in standalone components', async () => {
    const root = await fixture('inject', {
      'angular.json': '{}',
      'src/app/session.service.ts': `export class SessionService {}`,
      'src/app/header.component.ts': `
        import { Component, inject } from '@angular/core';
        import { SessionService } from './session.service';
        @Component({ selector: 'app-header', template: '<header></header>' })
        export class HeaderComponent {
          private readonly session = inject(SessionService);
        }
      `,
    });

    const graph = await scan(root);
    const component = graph.nodes.find((node) => node.path === 'src/app/header.component.ts');
    const service = graph.nodes.find((node) => node.path === 'src/app/session.service.ts');
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: component?.id, target: service?.id, relation: 'depends-on', label: 'Angular DI: SessionService' }),
    ]));
  });

  it('creates client route nodes and resolves eager and lazy component targets', async () => {
    const root = await fixture('routes', {
      'package.json': JSON.stringify({ dependencies: { '@angular/core': '^20.0.0', '@angular/router': '^20.0.0' } }),
      'tsconfig.json': JSON.stringify({ compilerOptions: { moduleResolution: 'Bundler', module: 'ESNext' } }),
      'src/app/app.routes.ts': `
        import { Routes } from '@angular/router';
        import { HomeComponent } from './home.component';
        export const routes: Routes = [
          { path: '', component: HomeComponent },
          { path: 'orders', loadComponent: () => import('./orders.component').then(m => m.OrdersComponent) },
          { path: 'legacy', redirectTo: 'orders' },
          { path: 'admin', children: [{ path: 'users', component: HomeComponent }] }
        ];
      `,
      'src/app/home.component.ts': `export class HomeComponent {}`,
      'src/app/orders.component.ts': `export class OrdersComponent {}`,
    });

    const graph = await scan(root);
    const home = graph.nodes.find((node) => node.path === 'src/app/home.component.ts');
    const orders = graph.nodes.find((node) => node.path === 'src/app/orders.component.ts');
    const rootRoute = graph.nodes.find((node) => node.kind === 'route' && node.metadata?.routePath === '/');
    const ordersRoute = graph.nodes.find((node) => node.kind === 'route' && node.metadata?.routePath === '/orders');
    const usersRoute = graph.nodes.find((node) => node.kind === 'route' && node.metadata?.routePath === '/admin/users');
    const legacy = graph.nodes.find((node) => node.kind === 'route' && node.metadata?.routePath === '/legacy');

    expect(rootRoute?.metadata).toMatchObject({ framework: 'angular', componentName: 'HomeComponent' });
    expect(ordersRoute?.metadata).toMatchObject({ framework: 'angular', lazy: true });
    expect(usersRoute?.metadata).toMatchObject({ framework: 'angular', componentName: 'HomeComponent' });
    expect(legacy?.metadata).toMatchObject({ redirectTo: 'orders' });
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: rootRoute?.id, target: home?.id, label: 'Angular route component' }),
      expect.objectContaining({ source: ordersRoute?.id, target: orders?.id, label: 'Angular lazy component' }),
      expect.objectContaining({ source: usersRoute?.id, target: home?.id, label: 'Angular route component' }),
    ]));
    expect(graph.metadata?.angularRouteCount).toBe(5);
  });

  it('does not apply Angular semantics to lookalike decorators without Angular evidence', async () => {
    const root = await fixture('false-positive', {
      'src/widget.component.ts': `
        function Component(value: unknown) { return (target: unknown) => target; }
        @Component({ selector: 'fake-widget' })
        export class WidgetComponent {}
      `,
    });

    const graph = await scan(root);
    const widget = graph.nodes.find((node) => node.path === 'src/widget.component.ts');
    expect(widget?.metadata?.framework).toBeUndefined();
    expect(graph.metadata).toMatchObject({ frameworkAdapterCount: 0, frameworkAdapters: '' });
  });

  it('omits dynamic route paths rather than presenting them as static routes', async () => {
    const root = await fixture('dynamic-route', {
      'angular.json': '{}',
      'src/app/app.routes.ts': `
        import { Routes } from '@angular/router';
        const segment = 'orders';
        export const routes: Routes = [{ path: segment }];
      `,
    });

    const graph = await scan(root);
    expect(graph.nodes.some((node) => node.kind === 'route')).toBe(false);
  });
});
