// Module Loader
// Handles dynamic loading of ES6 modules with error boundaries and dependency management

/**
 * Module Loader Class
 * Provides safe module loading with dependency resolution and error handling
 */
class ModuleLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        this.dependencyGraph = new Map();
        this.errorBoundaries = new Map();
        
        // Loading statistics
        this.stats = {
            modulesLoaded: 0,
            modulesFailed: 0,
            totalLoadTime: 0,
            startTime: performance.now()
        };
        
        console.log('📦 Module Loader initialized');
    }

    /**
     * Load a module with error boundary and dependency checking
     */
    async loadModule(modulePath, options = {}) {
        const {
            retries = 2,
            timeout = 10000,
            dependencies = [],
            fallback = null,
            critical = false
        } = options;

        // Check if module is already loaded
        if (this.loadedModules.has(modulePath)) {
            return this.loadedModules.get(modulePath);
        }

        // Check if module is currently loading
        if (this.loadingPromises.has(modulePath)) {
            return this.loadingPromises.get(modulePath);
        }

        console.log(`📥 Loading module: ${modulePath}`);
        const loadStartTime = performance.now();

        // Create loading promise with error boundary
        const loadingPromise = this.createLoadingPromise(
            modulePath, 
            { retries, timeout, dependencies, fallback, critical }
        );

        this.loadingPromises.set(modulePath, loadingPromise);

        try {
            const module = await loadingPromise;
            
            // Record successful load
            this.loadedModules.set(modulePath, module);
            this.loadingPromises.delete(modulePath);
            this.stats.modulesLoaded++;
            this.stats.totalLoadTime += performance.now() - loadStartTime;
            
            console.log(`✅ Module loaded successfully: ${modulePath}`);
            return module;
            
        } catch (error) {
            // Handle loading failure
            this.loadingPromises.delete(modulePath);
            this.stats.modulesFailed++;
            
            const errorInfo = {
                modulePath,
                error: error.message,
                timestamp: new Date().toISOString(),
                critical
            };
            
            this.errorBoundaries.set(modulePath, errorInfo);
            
            if (critical) {
                console.error(`🚨 Critical module failed to load: ${modulePath}`, error);
                throw new ModuleLoadError(`Critical module failed: ${modulePath}`, error);
            } else {
                console.warn(`⚠️ Non-critical module failed to load: ${modulePath}`, error);
                return fallback;
            }
        }
    }

    /**
     * Create loading promise with timeout and retries
     */
    async createLoadingPromise(modulePath, options) {
        const { retries, timeout, dependencies, fallback } = options;
        
        // Load dependencies first
        if (dependencies.length > 0) {
            console.log(`🔗 Loading dependencies for ${modulePath}:`, dependencies);
            await this.loadDependencies(dependencies);
        }

        // Attempt to load module with retries
        let lastError;
        for (let attempt = 1; attempt <= retries + 1; attempt++) {
            try {
                return await this.loadWithTimeout(modulePath, timeout);
            } catch (error) {
                lastError = error;
                if (attempt <= retries) {
                    console.warn(`⚠️ Module load attempt ${attempt} failed for ${modulePath}, retrying...`);
                    await this.delay(1000 * attempt); // Progressive backoff
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Load module with timeout
     */
    async loadWithTimeout(modulePath, timeout) {
        return Promise.race([
            import(modulePath),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Module load timeout: ${modulePath}`)), timeout)
            )
        ]);
    }

    /**
     * Load multiple dependencies in parallel
     */
    async loadDependencies(dependencies) {
        const dependencyPromises = dependencies.map(dep => {
            if (typeof dep === 'string') {
                return this.loadModule(dep, { critical: false });
            } else {
                return this.loadModule(dep.path, dep.options || { critical: false });
            }
        });
        
        try {
            await Promise.all(dependencyPromises);
        } catch (error) {
            console.warn('⚠️ Some dependencies failed to load:', error);
            // Continue with available dependencies
        }
    }

    /**
     * Load multiple modules in parallel
     */
    async loadModules(moduleConfigs) {
        console.log(`📦 Loading ${moduleConfigs.length} modules in parallel...`);
        
        const loadPromises = moduleConfigs.map(config => {
            if (typeof config === 'string') {
                return this.loadModule(config);
            } else {
                return this.loadModule(config.path, config.options);
            }
        });
        
        const results = await Promise.allSettled(loadPromises);
        
        // Analyze results
        const successful = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');
        
        console.log(`📊 Module loading complete: ${successful.length} successful, ${failed.length} failed`);
        
        if (failed.length > 0) {
            console.warn('⚠️ Failed modules:', failed.map(f => f.reason?.message));
        }
        
        return {
            successful: successful.map(r => r.value),
            failed: failed.map(r => r.reason),
            results
        };
    }

    /**
     * Load modules in sequence (for order-dependent loading)
     */
    async loadModulesSequentially(moduleConfigs) {
        console.log(`📦 Loading ${moduleConfigs.length} modules sequentially...`);
        
        const results = [];
        for (const config of moduleConfigs) {
            try {
                if (typeof config === 'string') {
                    const module = await this.loadModule(config);
                    results.push({ status: 'fulfilled', value: module });
                } else {
                    const module = await this.loadModule(config.path, config.options);
                    results.push({ status: 'fulfilled', value: module });
                }
            } catch (error) {
                results.push({ status: 'rejected', reason: error });
            }
        }
        
        return results;
    }

    /**
     * Check if all critical modules are loaded
     */
    checkCriticalModules() {
        const criticalErrors = Array.from(this.errorBoundaries.values())
            .filter(error => error.critical);
            
        if (criticalErrors.length > 0) {
            throw new ModuleLoadError(
                `Critical modules failed to load: ${criticalErrors.map(e => e.modulePath).join(', ')}`,
                criticalErrors
            );
        }
        
        return true;
    }

    /**
     * Get module if loaded, otherwise return null
     */
    getModule(modulePath) {
        return this.loadedModules.get(modulePath) || null;
    }

    /**
     * Check if module is loaded
     */
    isModuleLoaded(modulePath) {
        return this.loadedModules.has(modulePath);
    }

    /**
     * Preload modules for better performance
     */
    async preloadModules(modulePaths) {
        console.log(`⚡ Preloading ${modulePaths.length} modules...`);
        
        const preloadPromises = modulePaths.map(path => 
            this.loadModule(path, { critical: false, retries: 1 })
        );
        
        await Promise.allSettled(preloadPromises);
        console.log('⚡ Preloading complete');
    }

    /**
     * Create error boundary for a specific module
     */
    createErrorBoundary(modulePath, fallbackFn) {
        return async (...args) => {
            try {
                const module = await this.loadModule(modulePath);
                if (module && typeof module.default === 'function') {
                    return module.default(...args);
                } else {
                    throw new Error(`Module ${modulePath} does not have a default export function`);
                }
            } catch (error) {
                console.error(`Error in module ${modulePath}:`, error);
                if (fallbackFn) {
                    return fallbackFn(...args);
                }
                throw error;
            }
        };
    }

    /**
     * Get loading statistics
     */
    getStats() {
        return {
            ...this.stats,
            totalTime: performance.now() - this.stats.startTime,
            averageLoadTime: this.stats.modulesLoaded > 0 ? 
                this.stats.totalLoadTime / this.stats.modulesLoaded : 0,
            successRate: this.stats.modulesLoaded + this.stats.modulesFailed > 0 ?
                (this.stats.modulesLoaded / (this.stats.modulesLoaded + this.stats.modulesFailed) * 100).toFixed(1) + '%' :
                '0%',
            loadedModules: Array.from(this.loadedModules.keys()),
            failedModules: Array.from(this.errorBoundaries.keys())
        };
    }

    /**
     * Generate dependency report
     */
    generateDependencyReport() {
        return {
            totalModules: this.loadedModules.size,
            loadedModules: Array.from(this.loadedModules.keys()),
            failedModules: Array.from(this.errorBoundaries.entries()).map(([path, error]) => ({
                path,
                error: error.error,
                timestamp: error.timestamp,
                critical: error.critical
            })),
            dependencies: Object.fromEntries(this.dependencyGraph.entries())
        };
    }

    /**
     * Clear all loaded modules (for testing/reset)
     */
    clear() {
        this.loadedModules.clear();
        this.loadingPromises.clear();
        this.dependencyGraph.clear();
        this.errorBoundaries.clear();
        this.stats = {
            modulesLoaded: 0,
            modulesFailed: 0,
            totalLoadTime: 0,
            startTime: performance.now()
        };
        console.log('🧹 Module loader cleared');
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Custom error class for module loading failures
 */
class ModuleLoadError extends Error {
    constructor(message, originalError) {
        super(message);
        this.name = 'ModuleLoadError';
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
    }
}

// Create global module loader instance
const moduleLoader = new ModuleLoader();

// Export both the class and the instance
export { ModuleLoader, ModuleLoadError };
export default moduleLoader;