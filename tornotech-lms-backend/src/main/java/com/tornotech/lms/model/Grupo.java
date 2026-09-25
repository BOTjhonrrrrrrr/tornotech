package com.tornotech.lms.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "grupo")
@Getter
@Setter
@NoArgsConstructor
public class Grupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    // JsonIgnore: sin esto, serializar un Usuario (que trae su Grupo) entra en recursion infinita
    // Usuario -> Grupo -> miembros (List<Usuario>) -> Grupo -> ... (StackOverflowError). Ningun
    // endpoint necesita la lista de miembros anidada dentro de un Grupo serializado.
    @JsonIgnore
    @OneToMany(mappedBy = "grupo")
    private List<Usuario> miembros = new ArrayList<>();
}
