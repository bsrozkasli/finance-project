package com.ozkaslibasar.financeproject;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

/** EXPECTED_SOURCE_DEFAULT: derived_from_spec */
class ArchitectureTest {

    @Test
    void domain_package_must_not_depend_on_spring() {
        JavaClasses domainClasses = importPackage("com.ozkaslibasar.financeproject.domain");

        noClasses()
                .that().resideInAnyPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage("org.springframework..")
                .check(domainClasses);
    }

    @Test
    void domain_package_must_not_import_jakarta_persistence() {
        JavaClasses domainClasses = importPackage("com.ozkaslibasar.financeproject.domain");

        noClasses()
                .that().resideInAnyPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage("jakarta.persistence..")
                .check(domainClasses);
    }

    @Test
    void domain_package_must_not_import_lombok() {
        JavaClasses domainClasses = importPackage("com.ozkaslibasar.financeproject.domain");

        noClasses()
                .that().resideInAnyPackage("..domain..")
                .should().dependOnClassesThat().haveFullyQualifiedName("lombok.Data")
                .check(domainClasses);

        noClasses()
                .that().resideInAnyPackage("..domain..")
                .should().dependOnClassesThat().haveFullyQualifiedName("lombok.Getter")
                .check(domainClasses);

        noClasses()
                .that().resideInAnyPackage("..domain..")
                .should().dependOnClassesThat().haveFullyQualifiedName("lombok.Setter")
                .check(domainClasses);
    }


    @Test
    void domain_model_must_be_records_or_plain_java() {
        JavaClasses modelClasses = importPackage("com.ozkaslibasar.financeproject.domain.model");

        for (JavaClass javaClass : modelClasses) {
            if (javaClass.getName().contains("$")) {
                continue;
            }
            Class<?> reflected = javaClass.reflect();
            if (reflected.isRecord() || reflected.isEnum()) {
                continue;
            }

            assertThat(reflected.isInterface()).as("%s must be a concrete type", reflected.getName()).isFalse();
            assertThat(Modifier.isAbstract(reflected.getModifiers()))
                    .as("%s must not be abstract", reflected.getName())
                    .isFalse();

            for (Field field : reflected.getDeclaredFields()) {
                if (field.isSynthetic() || Modifier.isStatic(field.getModifiers())) {
                    continue;
                }
                assertThat(Modifier.isFinal(field.getModifiers()))
                        .as("%s.%s must be final", reflected.getSimpleName(), field.getName())
                        .isTrue();
            }
        }
    }

    private JavaClasses importPackage(String packageName) {
        return new ClassFileImporter()
                .withImportOption(new ImportOption.DoNotIncludeTests())
                .importPackages(packageName);
    }
}
