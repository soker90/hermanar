/// Módulo de tests para la aplicación
#[cfg(test)]
mod fixtures;

// ============================================================================
// TESTS POR FEATURE
// ============================================================================

#[cfg(test)]
mod familias;

#[cfg(test)]
mod hermanos;

#[cfg(test)]
mod cuotas;

#[cfg(test)]
mod integrity;

#[cfg(test)]
mod integration;

#[cfg(test)]
mod use_cases;
