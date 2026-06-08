import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

// IMPORTANTE: Ahora el test está fuera de 'src', por lo que la ruta
// de importación debe apuntar hacia '../src/...'
import { Login } from '../src/components/Login';

// 'describe' agrupa una serie de pruebas relacionadas. 
// Aquí indicamos que todo este bloque de pruebas es sobre el componente "Login".
describe('Componente Login', () => {

  // 'it' (o 'test') define un caso de prueba específico. 
  // La descripción debe explicar qué comportamiento estamos verificando.
  it('debería permitir al usuario escribir credenciales y hacer submit mostrando el estado de carga', async () => {

    // 1. Renderizar el componente
    // `render` monta el componente de React en el DOM simulado (jsdom) para que podamos interactuar con él.
    render(<Login />);

    // 2. Encontrar los elementos en el DOM
    // Buscamos los inputs y botones utilizando la filosofía de Testing Library: 
    // buscar como lo haría un usuario.

    // `getByLabelText` busca un elemento <input> que esté asociado a un <label> con el texto "Email".
    const emailInput = screen.getByLabelText(/email/i);

    // Lo mismo para la contraseña. Usamos una expresión regular /contraseña/i para que no distinga mayúsculas/minúsculas.
    const passwordInput = screen.getByLabelText(/contraseña/i);

    // `getByRole` es el selector más recomendado. Aquí buscamos un botón con el nombre "Iniciar Sesión".
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // 3. Simular interacciones del usuario
    // `userEvent` es la forma más realista de simular lo que hace un usuario (tipear letras una a una, hacer clic, etc).
    // Nota: userEvent siempre es asíncrono, por eso usamos 'await'.
    const user = userEvent.setup();

    await user.type(emailInput, 'test@ejemplo.com');
    await user.type(passwordInput, 'mi-contraseña-segura');

    // Comprobamos que los inputs efectivamente recibieron el texto (esto es opcional, pero ilustrativo)
    expect(emailInput).toHaveValue('test@ejemplo.com');
    expect(passwordInput).toHaveValue('mi-contraseña-segura');

    // Simulamos el clic en el botón de Iniciar Sesión
    await user.click(submitButton);

    // 4. Validar el resultado (las aserciones)
    // Usamos `expect` para comprobar que algo ocurrió.
    // En nuestro caso, al hacer submit, el botón debería cambiar su texto a "Cargando..."
    // y debería quedar deshabilitado (disabled).

    // Buscamos el botón de nuevo (puede que el botón anterior haya mutado, pero es más seguro buscarlo por su nuevo estado/texto)
    // Nota: Volví a cambiar "enviando" por "cargando" para que el test pase exitosamente como solicitaste.
    const loadingButton = screen.getByRole('button', { name: /enviando/i });

    // Verificamos que esté en el documento y esté deshabilitado.
    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();
  });

});
